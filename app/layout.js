import "./globals.css";

export const metadata = {
  title: "MoCE — Ministry of Community Empowerment",
  description: "Social Welfare Program with an AI-powered case-resolution chat assistant.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
