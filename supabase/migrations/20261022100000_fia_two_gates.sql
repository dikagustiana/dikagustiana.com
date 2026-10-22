-- =============================================================================
-- Finance in Action: two ways in (docs/company-models/two-gates/PRD.md R1, R2).
--
-- Section 06 read one view, fsre_published.model_packages, which only the FSRE
-- suite can fill. This adds the second way in, models the owner approves
-- himself, held to the same contract, and one view both ways end in:
--
--   fia.contract_schema   the contract (model-package.schema.json, proposal
--                         v3.1) as the database holds it. The literal below is
--                         the file, verbatim; tests/unit/fiaTwoGates.test.ts
--                         parses it and compares it with the contract file.
--                         Insert-only: a new contract is a new row.
--   fia.manual_release    the manual channel (PRD R1). The database refuses a
--                         row that does not match the contract's JSON Schema
--                         (pg_jsonschema, D4), whose meta.ticker, meta.version
--                         or meta.contentHash differ from its columns, whose
--                         provenance is not filings, or that is published
--                         without an approver and a time, or with a failed
--                         gate (D5). A published row is never edited or
--                         deleted; it can only be withdrawn. A withdrawn row
--                         is final. A revision is a new row with a new version.
--   fia.model_packages    what the site reads (R2): the FSRE channel and the
--                         published manual rows, one row per ticker, the most
--                         recent approved_at winning and FSRE winning an exact
--                         tie (D2), a package with a failed gate never in it
--                         from either channel (D5). `channel` is a column,
--                         never part of `package`, so the contract is
--                         unchanged.
--   fia_private           the helpers: the FSRE reader and the guard
--                         triggers. Not exposed to the Data API.
--
-- The FSRE schemas (fsre, fsre_private, fsre_status, fsre_published) belong to
-- the private fsre-skills repository and are not touched: no DDL, no grant, no
-- row. fia_private.fsre_packages() reads fsre_published.model_packages from
-- plpgsql, so the view records no dependency on it: an FSRE migration can
-- replace its view freely, and this migration applies on a database without
-- the FSRE schemas at all (a local stack, PRD A2), where the FSRE channel is
-- simply empty. The reader runs as the caller, so the site's anon role sees
-- the FSRE packages exactly as far as FSRE's own grant on its view lets it.
--
-- fia.model_packages runs with its owner's rights (no security_invoker): anon
-- is granted the view and nothing else in fia, and reads fia.manual_release
-- only through it. The Supabase linter reports this as a security-definer
-- view; it is the design (PRD R1: no grant to anon on the table).
--
-- After applying: Project Settings -> Data API -> Exposed schemas -> add fia.
-- Runbook: docs/company-models/two-gates/RUNBOOK.md. Tests:
-- supabase/tests/fia_manual_release.sql (one transaction, rolled back) and
-- supabase/tests/fsre_fingerprint.sql (run before and after; identical).
--
-- DOWN (only while fia.manual_release holds no published row):
--   DROP SCHEMA fia CASCADE;
--   DROP SCHEMA fia_private CASCADE;
--   (pg_jsonschema stays; DROP EXTENSION pg_jsonschema; if nothing else uses it.)
-- =============================================================================

-- pg_jsonschema in Supabase's extensions schema, where every call below names it.
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_jsonschema WITH SCHEMA extensions;
DO $check$
BEGIN
  IF (SELECT n.nspname FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
      WHERE e.extname = 'pg_jsonschema') IS DISTINCT FROM 'extensions' THEN
    RAISE EXCEPTION 'pg_jsonschema is installed outside the extensions schema; this migration calls extensions.jsonb_matches_schema';
  END IF;
END
$check$;

CREATE SCHEMA fia;
COMMENT ON SCHEMA fia IS
  'Finance in Action, two ways in (docs/company-models/two-gates). Exposed to the Data API for fia.model_packages only.';
CREATE SCHEMA fia_private;
COMMENT ON SCHEMA fia_private IS
  'Helpers of the fia schema: the FSRE reader and the guard triggers. Never exposed to the Data API.';

-- -----------------------------------------------------------------------------
-- The contract
-- -----------------------------------------------------------------------------

CREATE TABLE fia.contract_schema (
  version text PRIMARY KEY,
  schema  jsonb NOT NULL,
  CONSTRAINT contract_schema_is_a_schema CHECK (extensions.jsonschema_is_valid(schema::json))
);
COMMENT ON TABLE fia.contract_schema IS
  'The model package contract the database validates fia.manual_release against. Insert-only.';

INSERT INTO fia.contract_schema (version, schema) VALUES ('proposal-v3.1', $json$
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "urn:dikagustiana:finance-in-action:model-package:proposal-v3.1",
  "title": "Finance in Action model package",
  "description": "PROPOSAL v3.1, pending owner approval and FSRE P-2. One JSON package per model version. Cell addresses: <sheet id>!<column><row>, row 1 the header, rows[n] on row n + 2, column A label, column B unit, column C the first period. Additions to the brief's shape are marked ADDITION.",
  "type": "object",
  "additionalProperties": false,
  "required": ["meta", "periods", "sheets", "driverTree", "unitEconomics", "peerBand", "workpaper"],
  "properties": {
    "meta": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "ticker", "name", "subIndustry", "chainStage", "pair", "version", "contentHash",
        "asOf", "provenance", "status", "depth", "conditionIds", "skillVersions"
      ],
      "properties": {
        "ticker": { "type": "string", "pattern": "^[A-Z0-9]{2,8}$" },
        "name": { "type": "string", "minLength": 1 },
        "subIndustry": { "type": "string", "minLength": 1 },
        "chainStage": {
          "type": "string",
          "description": "An id from the chain map's STAGES. ADDITION: or band-energy / band-logistics.",
          "minLength": 1
        },
        "pair": { "type": "array", "items": { "type": "string", "pattern": "^[A-Z0-9]{2,8}$" } },
        "version": { "type": "string", "minLength": 1 },
        "contentHash": { "type": "string", "pattern": "^[0-9a-f]{64}$" },
        "asOf": {
          "type": "object",
          "additionalProperties": false,
          "required": ["latestQuarter", "fullStatementsTo"],
          "properties": {
            "latestQuarter": { "type": "string" },
            "fullStatementsTo": { "type": "string" }
          }
        },
        "provenance": { "enum": ["filings", "fixture", "synthetic"] },
        "status": { "enum": ["published", "preview", "in_progress", "not_started"] },
        "depth": { "enum": ["foundation", "executive", "institutional"] },
        "conditionIds": { "type": "array", "items": { "type": "integer", "minimum": 1 } },
        "skillVersions": { "type": "object", "additionalProperties": { "type": "string" } },
        "rounding": {
          "description": "ADDITION",
          "type": "object",
          "additionalProperties": false,
          "required": ["decimals"],
          "properties": { "decimals": { "type": "integer", "minimum": 0 } }
        },
        "conditionNotes": {
          "description": "ADDITION",
          "type": "object",
          "propertyNames": { "pattern": "^[0-9]+$" },
          "additionalProperties": { "type": "string", "minLength": 1 }
        }
      }
    },
    "periods": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "label", "kind", "forecast"],
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "label": { "type": "string", "minLength": 1 },
          "kind": { "enum": ["quarter", "fy"] },
          "forecast": { "type": "boolean" }
        }
      }
    },
    "sheets": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "rows"],
        "properties": {
          "id": { "enum": ["reported", "model", "assumptions"] },
          "rows": { "type": "array", "items": { "$ref": "#/definitions/row" } }
        }
      }
    },
    "driverTree": {
      "type": "object",
      "additionalProperties": false,
      "required": ["nodes", "edges"],
      "properties": {
        "nodes": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["id", "label", "rowRef"],
            "properties": {
              "id": { "type": "string", "minLength": 1 },
              "label": { "type": "string", "minLength": 1 },
              "rowRef": { "$ref": "#/definitions/rowRef" }
            }
          }
        },
        "edges": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["from", "to"],
            "properties": { "from": { "type": "string" }, "to": { "type": "string" } }
          }
        }
      }
    },
    "unitEconomics": {
      "type": "object",
      "additionalProperties": false,
      "required": ["unit", "basisLabel", "denominatorRowRef", "periods", "lines"],
      "properties": {
        "unit": { "type": "string", "minLength": 1 },
        "basisLabel": { "type": "string", "minLength": 1 },
        "denominatorRowRef": { "$ref": "#/definitions/rowRef" },
        "periods": { "type": "array", "items": { "type": "string" } },
        "lines": { "type": "array", "minItems": 1, "items": { "$ref": "#/definitions/ueLine" } }
      }
    },
    "peerBand": {
      "type": "array",
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["metric", "unit", "period", "value"],
        "properties": {
          "metric": { "type": "string", "minLength": 1 },
          "unit": { "type": "string" },
          "period": { "type": "string" },
          "value": { "type": ["number", "null"] },
          "rowRef": { "description": "ADDITION", "$ref": "#/definitions/rowRef" }
        }
      }
    },
    "workpaper": {
      "type": "object",
      "additionalProperties": false,
      "required": ["gates"],
      "properties": {
        "gates": {
          "type": "array",
          "items": {
            "type": "object",
            "additionalProperties": false,
            "required": ["name", "status"],
            "properties": {
              "name": { "type": "string", "minLength": 1 },
              "status": { "enum": ["passed", "passed_with_escalation", "failed", "not_run"] },
              "note": { "type": "string" }
            }
          }
        },
        "preparedBy": { "description": "ADDITION", "type": "string" },
        "approvedBy": { "type": "string" },
        "approvedAt": { "type": "string" }
      }
    }
  },
  "definitions": {
    "rowRef": { "type": "string", "pattern": "^(reported|model|assumptions)![A-Za-z0-9_]+$" },
    "row": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "label", "unit", "cells"],
      "properties": {
        "id": { "type": "string", "pattern": "^[A-Za-z0-9_]+$" },
        "label": { "type": "string", "minLength": 1 },
        "unit": { "type": "string" },
        "style": { "enum": ["total", "ratio"] },
        "cells": { "type": "array", "items": { "$ref": "#/definitions/cell" } }
      }
    },
    "cell": {
      "type": "object",
      "additionalProperties": false,
      "required": ["value", "kind"],
      "properties": {
        "value": { "type": ["number", "null"] },
        "kind": { "enum": ["sourced", "formula", "assumption", "missing"] },
        "formula": { "type": "string", "minLength": 1 },
        "source": {
          "type": "object",
          "additionalProperties": false,
          "required": ["issuer", "document", "period"],
          "properties": {
            "issuer": { "type": "string", "minLength": 1 },
            "document": { "type": "string", "minLength": 1 },
            "period": { "type": "string", "minLength": 1 },
            "page": { "type": "integer", "minimum": 1 },
            "note": { "type": "string" },
            "xbrlConcept": { "type": "string" },
            "docSha256": { "type": "string", "pattern": "^[0-9a-f]{64}$" }
          }
        },
        "tieOut": {
          "type": "object",
          "additionalProperties": false,
          "required": ["externalValue", "sourceText", "difference", "status"],
          "properties": {
            "externalValue": { "type": "number" },
            "sourceText": { "type": "string", "minLength": 1 },
            "difference": { "type": "number" },
            "status": { "enum": ["agrees", "differs", "not_checked"] }
          }
        },
        "note": { "type": "string" }
      },
      "allOf": [
        { "if": { "properties": { "kind": { "const": "formula" } } }, "then": { "required": ["formula"] } },
        { "if": { "properties": { "kind": { "const": "sourced" } } }, "then": { "required": ["source"], "properties": { "value": { "type": "number" } } } },
        { "if": { "properties": { "kind": { "const": "assumption" } } }, "then": { "properties": { "value": { "type": "number" } } } },
        { "if": { "properties": { "kind": { "const": "missing" } } }, "then": { "properties": { "value": { "type": "null" } } } }
      ]
    },
    "ueLine": {
      "type": "object",
      "additionalProperties": false,
      "required": ["id", "label", "role", "rowRef"],
      "properties": {
        "id": { "type": "string", "minLength": 1 },
        "label": { "type": "string", "minLength": 1 },
        "role": { "enum": ["revenue", "cost", "subtotal", "unsplit"] },
        "rowRef": { "$ref": "#/definitions/rowRef" },
        "driver": {
          "type": "object",
          "additionalProperties": false,
          "required": ["description", "physicalUnit", "inputRowRefs"],
          "properties": {
            "description": { "type": "string", "minLength": 1 },
            "physicalUnit": { "type": "string", "minLength": 1 },
            "inputRowRefs": { "type": "array", "items": { "$ref": "#/definitions/rowRef" } }
          }
        },
        "contains": { "type": "array", "minItems": 1, "items": { "type": "string", "minLength": 1 } }
      },
      "allOf": [
        { "if": { "properties": { "role": { "const": "unsplit" } } }, "then": { "required": ["contains"] }, "else": { "not": { "required": ["contains"] } } }
      ]
    }
  }
}
$json$::jsonb);

-- -----------------------------------------------------------------------------
-- The manual channel (PRD R1)
-- -----------------------------------------------------------------------------

CREATE TABLE fia.manual_release (
  ticker       text NOT NULL,
  version      text NOT NULL,
  content_hash text NOT NULL,
  package      jsonb NOT NULL,
  status       text NOT NULL DEFAULT 'staged',
  approved_by  text,
  approved_at  timestamptz,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   text NOT NULL DEFAULT current_user,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT manual_release_pkey PRIMARY KEY (ticker, version),
  CONSTRAINT manual_release_ticker_format CHECK (ticker ~ '^[A-Z0-9]{2,8}$'),
  CONSTRAINT manual_release_content_hash_format CHECK (content_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT manual_release_status_known CHECK (status IN ('staged', 'published', 'withdrawn')),
  -- IS NOT DISTINCT FROM, not =: a missing key makes = null, and a CHECK passes on null.
  CONSTRAINT manual_release_meta_ticker CHECK ((package #>> '{meta,ticker}') IS NOT DISTINCT FROM ticker),
  CONSTRAINT manual_release_meta_version CHECK ((package #>> '{meta,version}') IS NOT DISTINCT FROM version),
  CONSTRAINT manual_release_meta_content_hash CHECK ((package #>> '{meta,contentHash}') IS NOT DISTINCT FROM content_hash),
  CONSTRAINT manual_release_provenance_filings CHECK ((package #>> '{meta,provenance}') IS NOT DISTINCT FROM 'filings'),
  CONSTRAINT manual_release_published_approved CHECK (
    status <> 'published' OR (btrim(coalesce(approved_by, '')) <> '' AND approved_at IS NOT NULL)
  ),
  CONSTRAINT manual_release_published_no_failed_gate CHECK (
    status <> 'published' OR NOT jsonb_path_exists(package, '$.workpaper.gates[*] ? (@.status == "failed")')
  )
);
COMMENT ON TABLE fia.manual_release IS
  'Model packages the owner approves himself (PRD R1). Write with scripts/fia/publish-manual.ts. A published row can only be withdrawn; a revision is a new version.';

-- The rules a CHECK cannot state: the JSON Schema, and what may change.
CREATE FUNCTION fia_private.manual_release_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
DECLARE
  v_schema jsonb;
  v_errors text;
  v_check  boolean;
BEGIN
  IF tg_op = 'DELETE' THEN
    IF old.status = 'staged' THEN
      RETURN old;
    END IF;
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      CONSTRAINT = CASE old.status WHEN 'published' THEN 'manual_release_published_locked' ELSE 'manual_release_withdrawn_final' END,
      MESSAGE = format('fia.manual_release %s %s is %s and cannot be deleted', old.ticker, old.version, old.status),
      HINT = 'Only a staged row can be deleted. Withdraw a published row instead.';
  END IF;

  IF tg_op = 'INSERT' THEN
    IF new.status NOT IN ('staged', 'published') THEN
      RAISE EXCEPTION USING
        ERRCODE = 'check_violation',
        CONSTRAINT = 'manual_release_new_row_status',
        MESSAGE = format('a new fia.manual_release row is staged or published, not %s', new.status);
    END IF;
  ELSE
    IF old.status = 'published' THEN
      -- Only the status may change, and only to withdrawn.
      IF new.status IS DISTINCT FROM 'withdrawn'
         OR (new.ticker, new.version, new.content_hash, new.package, new.approved_by, new.approved_at,
             new.note, new.created_at, new.created_by)
            IS DISTINCT FROM
            (old.ticker, old.version, old.content_hash, old.package, old.approved_by, old.approved_at,
             old.note, old.created_at, old.created_by) THEN
        RAISE EXCEPTION USING
          ERRCODE = 'check_violation',
          CONSTRAINT = 'manual_release_published_locked',
          MESSAGE = format('fia.manual_release %s %s is published: it can only be withdrawn', old.ticker, old.version),
          HINT = 'A revision is a new row with a new version.';
      END IF;
      new.updated_at := now();
      RETURN new;
    END IF;
    IF old.status = 'withdrawn' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'check_violation',
        CONSTRAINT = 'manual_release_withdrawn_final',
        MESSAGE = format('fia.manual_release %s %s is withdrawn, which is final', old.ticker, old.version),
        HINT = 'A revision is a new row with a new version.';
    END IF;
    -- A staged row: who made it and when stay as they were.
    new.created_at := old.created_at;
    new.created_by := old.created_by;
    new.updated_at := now();
  END IF;

  -- The contract (D4), on a new package only. A missing contract refuses the
  -- row; it never lets it through.
  v_check := tg_op = 'INSERT';
  IF NOT v_check THEN
    v_check := new.package IS DISTINCT FROM old.package;
  END IF;
  IF v_check THEN
    SELECT c.schema INTO v_schema FROM fia.contract_schema c WHERE c.version = 'proposal-v3.1';
    IF v_schema IS NULL THEN
      RAISE EXCEPTION USING
        ERRCODE = 'check_violation',
        CONSTRAINT = 'manual_release_contract',
        MESSAGE = 'fia.contract_schema holds no proposal-v3.1 contract, so no package can be checked';
    END IF;
    IF extensions.jsonb_matches_schema(v_schema::json, new.package) IS NOT TRUE THEN
      SELECT string_agg(left(e, 300), E'\n')
        INTO v_errors
        FROM (SELECT e FROM unnest(extensions.jsonschema_validation_errors(v_schema::json, new.package::json)) AS e LIMIT 5) AS errs;
      RAISE EXCEPTION USING
        ERRCODE = 'check_violation',
        CONSTRAINT = 'manual_release_contract',
        MESSAGE = format('fia.manual_release %s %s does not match the contract (model-package.schema.json, proposal v3.1)', new.ticker, new.version),
        DETAIL = coalesce(v_errors, '');
    END IF;
  END IF;
  RETURN new;
END
$fn$;

CREATE TRIGGER manual_release_guard
  BEFORE INSERT OR UPDATE OR DELETE ON fia.manual_release
  FOR EACH ROW EXECUTE FUNCTION fia_private.manual_release_guard();

-- TRUNCATE skips row triggers; it is refused outright on both tables.
CREATE FUNCTION fia_private.refuse_truncate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'check_violation',
    CONSTRAINT = tg_table_name || '_no_truncate',
    MESSAGE = format('%I.%I cannot be truncated', tg_table_schema, tg_table_name);
END
$fn$;

CREATE TRIGGER manual_release_no_truncate
  BEFORE TRUNCATE ON fia.manual_release
  FOR EACH STATEMENT EXECUTE FUNCTION fia_private.refuse_truncate();

-- The contract is insert-only.
CREATE FUNCTION fia_private.contract_schema_insert_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $fn$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = 'check_violation',
    CONSTRAINT = 'contract_schema_insert_only',
    MESSAGE = format('fia.contract_schema %s cannot be changed or deleted; a new contract is a new row', old.version);
END
$fn$;

CREATE TRIGGER contract_schema_insert_only
  BEFORE UPDATE OR DELETE ON fia.contract_schema
  FOR EACH ROW EXECUTE FUNCTION fia_private.contract_schema_insert_only();

CREATE TRIGGER contract_schema_no_truncate
  BEFORE TRUNCATE ON fia.contract_schema
  FOR EACH STATEMENT EXECUTE FUNCTION fia_private.refuse_truncate();

-- -----------------------------------------------------------------------------
-- The FSRE channel, read without a dependency
-- -----------------------------------------------------------------------------

-- The FSRE suite's published packages, as fsre_published.model_packages gives
-- them, or none on a database without it. Runs as the caller (SECURITY
-- INVOKER): what anon reads here is what FSRE grants anon on its own view.
-- Reads only package, version, content_hash, approved_by and approved_at.
CREATE FUNCTION fia_private.fsre_packages()
RETURNS TABLE (
  ticker       text,
  version      text,
  content_hash text,
  approved_by  text,
  approved_at  timestamptz,
  package      jsonb
)
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $fn$
BEGIN
  IF to_regclass('fsre_published.model_packages') IS NULL THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT p.package #>> '{meta,ticker}', p.version, p.content_hash, p.approved_by, p.approved_at, p.package
    FROM fsre_published.model_packages AS p;
END
$fn$;

-- -----------------------------------------------------------------------------
-- The one view the site reads (PRD R2)
-- -----------------------------------------------------------------------------

-- D2: the most recent approved_at wins; an exact tie goes to FSRE; a null
-- approved_at is older than any time (NULLS LAST, since DESC alone puts nulls
-- first). Two candidates of one channel that tie on approved_at fall to the
-- higher version (compared as text), then the content hash, so the choice
-- never depends on the plan. D5: a package with a failed gate is not a candidate, from either
-- channel (the manual table refuses one at publish already). In the package,
-- meta.status is published and workpaper.approvedBy/approvedAt come from the
-- row, as the FSRE view does.
CREATE VIEW fia.model_packages AS
WITH candidates AS (
  SELECT f.ticker, f.version, 'fsre'::text AS channel, f.content_hash, f.approved_by, f.approved_at, f.package
  FROM fia_private.fsre_packages() AS f
  UNION ALL
  SELECT m.ticker, m.version, 'manual'::text, m.content_hash, m.approved_by, m.approved_at,
         jsonb_set(
           jsonb_set(m.package, '{meta,status}', '"published"'),
           '{workpaper}',
           (m.package -> 'workpaper') || jsonb_build_object(
             'approvedBy', m.approved_by,
             'approvedAt', to_char(m.approved_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')))
  FROM fia.manual_release AS m
  WHERE m.status = 'published'
)
SELECT DISTINCT ON (c.ticker)
       c.ticker, c.version, c.channel, c.content_hash, c.approved_by, c.approved_at, c.package
FROM candidates AS c
WHERE NOT jsonb_path_exists(c.package, '$.workpaper.gates[*] ? (@.status == "failed")')
ORDER BY c.ticker, c.approved_at DESC NULLS LAST, (c.channel = 'fsre') DESC, c.version DESC, c.content_hash;
COMMENT ON VIEW fia.model_packages IS
  'The published model packages Finance in Action reads: FSRE and manual, one per ticker (PRD R2, D2, D5).';

-- -----------------------------------------------------------------------------
-- Row security and grants
-- -----------------------------------------------------------------------------

ALTER TABLE fia.manual_release ENABLE ROW LEVEL SECURITY;   -- no policy: nobody but the owner
ALTER TABLE fia.contract_schema ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON SCHEMA fia, fia_private FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA fia FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA fia_private FROM PUBLIC, anon, authenticated;

-- anon: the view and nothing else. The view calls the FSRE reader as anon, so
-- anon may execute it; with no USAGE on fia_private it cannot name it.
GRANT USAGE ON SCHEMA fia TO anon;
GRANT SELECT ON fia.model_packages TO anon;
GRANT EXECUTE ON FUNCTION fia_private.fsre_packages() TO anon;

NOTIFY pgrst, 'reload schema';
