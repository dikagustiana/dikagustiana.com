/**
 * Paste and drag-drop image upload for the essay body.
 *
 * The gap this closes: dropping or pasting an image file into the editor did
 * nothing at all. The only way to get a picture into an essay was the Insert
 * Figure dialog, and a pasted screenshot vanished with no message.
 *
 * The in-flight placeholder is a ProseMirror *decoration*, not a node. That
 * is deliberate: a decoration lives outside the document, so it cannot be
 * serialized, cannot be autosaved, and cannot survive a failed upload. A dead
 * placeholder is impossible by construction rather than by remembering to
 * clean one up.
 *
 * On success the placeholder is replaced by a `figure` node — the editorial
 * primitive that already round-trips through all four places of the content
 * contract (extensions, serialize, ArticleBody, sanitizeHtml).
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { EditorView } from '@tiptap/pm/view';
import {
  isUploadableImage,
  readImageSize,
  uploadEssayImage,
  validateImageFile,
} from './uploadImage';

export const imageUploadKey = new PluginKey<DecorationSet>('essayImageUpload');

interface AddPlaceholder {
  add: { id: symbol; pos: number };
}
interface RemovePlaceholder {
  remove: { id: symbol };
}
type UploadMeta = AddPlaceholder | RemovePlaceholder;

function placeholderWidget(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'essay-image-uploading';
  wrapper.setAttribute('role', 'status');
  wrapper.setAttribute('aria-live', 'polite');
  wrapper.textContent = 'Uploading image…';
  return wrapper;
}

/** Where did the placeholder end up after concurrent edits? Null if it is gone. */
function findPlaceholder(view: EditorView, id: symbol): number | null {
  const set = imageUploadKey.getState(view.state);
  if (!set) return null;
  const found = set.find(undefined, undefined, spec => spec.id === id);
  return found.length ? found[0].from : null;
}

export interface ImageUploadOptions {
  /** Storage folder; defaults to `drafts`. */
  folder?: string;
  /** Surfaces a failure to the author. */
  onError?: (message: string) => void;
  /** Announces a completed upload. */
  onSuccess?: () => void;
}

async function startUpload(
  view: EditorView,
  file: File,
  pos: number,
  options: ImageUploadOptions,
) {
  // Reject before showing a placeholder, so an oversized file never flashes
  // an upload that was never going to happen.
  const invalid = validateImageFile(file);
  if (invalid) {
    options.onError?.(invalid);
    return;
  }

  const id = Symbol('essay-image-upload');
  const addMeta: UploadMeta = { add: { id, pos } };
  view.dispatch(view.state.tr.setMeta(imageUploadKey, addMeta));

  const clearPlaceholder = () => {
    const removeMeta: UploadMeta = { remove: { id } };
    view.dispatch(view.state.tr.setMeta(imageUploadKey, removeMeta));
  };

  try {
    const url = await uploadEssayImage(file, options.folder);
    const size = await readImageSize(url);
    const at = findPlaceholder(view, id);

    clearPlaceholder();

    // The author may have deleted the surrounding text while the upload was
    // in flight. If the anchor is gone the image has nowhere to go, and
    // guessing a position would drop it somewhere they did not ask for.
    if (at === null) return;

    const figure = view.state.schema.nodes.figure;
    if (!figure) return;

    view.dispatch(
      view.state.tr.replaceWith(
        at,
        at,
        figure.create({
          src: url,
          altText: '',
          caption: '',
          widthMode: 'content',
          kind: 'image',
          naturalWidth: size?.width ?? null,
          naturalHeight: size?.height ?? null,
          aspectRatio: size ? size.height / size.width : null,
        }),
      ),
    );
    options.onSuccess?.();
  } catch (error) {
    // Nothing was ever inserted into the document, so removing the decoration
    // returns the editor to exactly its pre-paste state.
    clearPlaceholder();
    options.onError?.(
      error instanceof Error ? error.message : 'The image could not be uploaded.',
    );
  }
}

function imageFilesFrom(list: FileList | null | undefined): File[] {
  if (!list || list.length === 0) return [];
  return Array.from(list).filter(isUploadableImage);
}

export const ImageUpload = Extension.create<ImageUploadOptions>({
  name: 'essayImageUpload',

  addOptions() {
    return { folder: undefined, onError: undefined, onSuccess: undefined };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin<DecorationSet>({
        key: imageUploadKey,

        state: {
          init: () => DecorationSet.empty,
          apply(tr, set) {
            // Keep placeholders pinned to their text as the document changes.
            let next = set.map(tr.mapping, tr.doc);
            const meta = tr.getMeta(imageUploadKey) as UploadMeta | undefined;

            if (meta && 'add' in meta) {
              next = next.add(tr.doc, [
                Decoration.widget(meta.add.pos, placeholderWidget, {
                  id: meta.add.id,
                  side: 1,
                }),
              ]);
            } else if (meta && 'remove' in meta) {
              next = next.remove(
                next.find(undefined, undefined, spec => spec.id === meta.remove.id),
              );
            }
            return next;
          },
        },

        props: {
          decorations: state => imageUploadKey.getState(state),

          handlePaste(view, event) {
            const files = imageFilesFrom(event.clipboardData?.files);
            if (files.length === 0) return false;
            event.preventDefault();
            const pos = view.state.selection.from;
            files.forEach(file => void startUpload(view, file, pos, options));
            return true;
          },

          handleDrop(view, event, _slice, moved) {
            // `moved` is an internal drag of existing content — never an upload.
            if (moved) return false;
            const files = imageFilesFrom(event.dataTransfer?.files);
            if (files.length === 0) return false;
            event.preventDefault();
            const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
            const pos = coords?.pos ?? view.state.selection.from;
            files.forEach(file => void startUpload(view, file, pos, options));
            return true;
          },
        },
      }),
    ];
  },
});
