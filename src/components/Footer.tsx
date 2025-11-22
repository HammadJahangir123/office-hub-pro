export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground text-center md:text-left">
            © {currentYear} Office Support Dashboard. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground text-center md:text-right">
            Powered by Hammad Jahangir
          </p>
        </div>
      </div>
    </footer>
  );
};
