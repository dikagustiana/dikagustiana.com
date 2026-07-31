import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { SEO } from "@/components/SEO";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <SEO title="Page not found" description="The page you were looking for could not be found." noindex />
      <div className="text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">404</p>
        <h1 className="mb-3 text-3xl font-display font-bold">Page not found</h1>
        <p className="mb-6 max-w-md text-muted-foreground">
          The page you were looking for doesn’t exist or may have moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Return home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
