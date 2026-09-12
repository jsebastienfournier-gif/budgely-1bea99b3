import { Helmet } from "react-helmet-async";

const BASE_URL = "https://budgely.fr";

interface PageMetaProps {
  title: string;
  description: string;
  /** Chemin canonique de la page, ex. "/subscription". */
  path?: string;
  /** true pour les pages privées (tableau de bord, paramètres, etc.) */
  noindex?: boolean;
}

const PageMeta = ({ title, description, path = "/", noindex = false }: PageMetaProps) => {
  const canonical = `${BASE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  );
};

export default PageMeta;
