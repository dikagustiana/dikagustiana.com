import { Layout } from '@/components/Layout';
import { Breadcrumb } from '@/components/Breadcrumb';
import { FeatureCard } from '@/components/FeatureCard';

export default function Accounting() {
  return (
    <Layout>
      <div className="py-8 section-container">
        <Breadcrumb />
        <h1 className="text-3xl font-display font-bold mb-4">Accounting</h1>
        <p className="text-muted-foreground max-w-3xl mb-12">
          Master professional accounting with comprehensive modules covering financial statement analysis, consolidation procedures, and regulatory compliance requirements for modern business practice.
        </p>
        
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            title="FSLI Detail"
            description="Comprehensive Financial Statement Line Items analysis with bilingual explanations, definitions, and practical examples for professional accounting."
            icon="FileText"
            linkUrl="/accounting/fsli"
            linkText="Learn More"
          />
          <FeatureCard
            title="Consolidated Reporting"
            description="Master group-wide financial consolidation, elimination entries, and comprehensive reporting frameworks for multi-entity organizations."
            icon="BarChart3"
            linkUrl="/accounting/consolidated"
            linkText="Learn More"
          />
          <FeatureCard
            title="Statutory Reporting"
            description="Navigate regulatory compliance requirements, statutory financial reporting standards, and legal reporting obligations across jurisdictions."
            icon="BookOpen"
            linkUrl="/accounting/statutory"
            linkText="Learn More"
          />
        </div>

        <div className="bg-card-light rounded-xl p-8">
          <h2 className="text-xl font-display font-bold text-card-light-foreground mb-6">Professional Accounting Standards</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-card-light-foreground mb-4">Key Standards & Frameworks</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• International Financial Reporting Standards (IFRS)</li>
                <li>• Generally Accepted Accounting Principles (GAAP)</li>
                <li>• Local regulatory requirements and compliance</li>
                <li>• Consolidated reporting methodologies</li>
                <li>• Financial statement presentation standards</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-card-light-foreground mb-4">Learning Outcomes</h3>
              <ul className="space-y-2 text-muted-foreground text-sm">
                <li>• Comprehensive understanding of FSLI components</li>
                <li>• Advanced consolidation and elimination techniques</li>
                <li>• Regulatory compliance and statutory reporting</li>
                <li>• Professional accounting judgment and decision-making</li>
                <li>• Real-world application of accounting standards</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
