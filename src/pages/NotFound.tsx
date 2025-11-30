import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  // Track 404 routes without exposing technical details

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
      {/* Video Background */}
      <div className="fixed inset-0 -z-10">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/space-background.mp4" type="video/mp4" />
        </video>
      </div>

      <div className="glass-card-light p-12 rounded-2xl text-center max-w-md">
        <h1 className="mb-4 text-4xl font-bold text-primary">404</h1>
        <p className="mb-4 text-xl text-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary-glow font-semibold">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
