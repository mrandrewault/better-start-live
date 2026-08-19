import './globals.css';
import './interview.css';

export const metadata = {
  title: "Meanwhile — Andrew’s Edition",
  description: "Andrew’s personalized, rage-free wall of good news, discovery and delight",
  openGraph: {title:"Meanwhile — Andrew’s Edition",description:"Rage-free news, discovery and good times.",siteName:"Meanwhile",type:"website"},
  twitter: {card:"summary_large_image",title:"Meanwhile — Andrew’s Edition",description:"Rage-free news, discovery and good times."}
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
