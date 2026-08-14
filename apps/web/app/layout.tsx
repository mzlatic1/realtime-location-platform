import 'maplibre-gl/dist/maplibre-gl.css';
import './styles.css';
export const metadata = { title: 'Vector / Live Location Operations' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
