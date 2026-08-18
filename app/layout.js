import './globals.css';
import './interview.css';

export const metadata = {
  metadataBase: new URL("https://www.upwards.news"),
  title: "Upwards — Andrew’s Edition",
  description: "Andrew’s personalized, rage-free wall of good news, discovery and delight",
  alternates: {canonical: "/"},
  openGraph: {
    title: "Upwards — Andrew’s Edition",
    description: "Rage-free news, discovery and good times.",
    url: "https://www.upwards.news",
    siteName: "Upwards",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Upwards — Andrew’s Edition",
    description: "Rage-free news, discovery and good times."
  }
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
