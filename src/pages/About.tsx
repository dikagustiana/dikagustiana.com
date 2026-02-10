import { PageLayout } from '@/components/layouts/PageLayout';
import { SEO } from '@/components/SEO';

export default function About() {
  return (
    <PageLayout
      variant="content"
      role="hybrid"
      breadcrumbs={[
        { label: 'Home', path: '/' },
        { label: 'About' },
      ]}
    >
      <SEO
        title="About"
        description="Dika Gustiana — FP&A Manager, finance professional, and researcher on green transition economics."
      />

      <section className="py-12 md:py-16">
        <div className="container max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-8">
            About
          </h1>

          <div className="space-y-6 text-muted-foreground leading-relaxed">
            <p>
              Dika Gustiana is an FP&amp;A Manager at MGM Bosco Logistics, a portfolio company
              of Saratoga Investama Sedaya. Previously at EY. Over 20 years of experience in
              finance, with specializations in budget control systems, rolling forecasts, variance
              analysis, forensic audit, and internal controls.
            </p>

            <p>
              BSc Accounting from Universitas Padjadjaran (3.8 GPA). Thesis research on carbon
              taxation and its impact on corporate financial performance in Indonesia.
            </p>

            <p>
              Current research interests include climate finance, green transition policy, and
              what this site calls Indonesia's "Transition Divide" — the structural gap between
              decarbonization ambition and implementation capacity.
            </p>

            <p>
              This site publishes analysis on finance, accounting, and green transition economics.
              The material is practitioner-focused and opinionated. It is not financial advice.
            </p>

            {/* <p>
              <a href="https://linkedin.com/in/YOUR-PROFILE" className="text-accent hover:underline">
                LinkedIn
              </a>
            </p> */}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
