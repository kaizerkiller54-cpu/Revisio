import React from "react";
import { Phone, Mail, MapPin, Navigation } from "lucide-react";
import { AppLogo } from "./AppLogo";
import { Reveal } from "./motion";
import footerBg from "../assets/images/hero_campus.webp";

interface FooterProps {
  onNavigate: (tab: string) => void;
}

const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Campus+d%27Eyang+La+Lobo+La+Lekie";

const usefulLinks: Array<{ label: string; tab: string }> = [
  { label: "Accueil", tab: "home" },
  { label: "Matières", tab: "subjects" },
  { label: "Épreuves", tab: "exams" },
  { label: "Contribuer", tab: "contribute" },
  { label: "Paramètres", tab: "settings" },
];

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="relative overflow-hidden text-slate-200">
      {/* Fondu dégradé subtil et progressif entre la page et le pied de page */}
      <div className="absolute top-0 inset-x-0 h-28 sm:h-44 bg-gradient-to-b from-slate-50 dark:from-slate-950 via-slate-950/70 to-transparent pointer-events-none z-10" />

      {/* Fond photo campus + overlay de lisibilité */}
      <div className="absolute inset-0" aria-hidden>
        <img
          src={footerBg}
          alt=""
          className="w-full h-full object-cover object-center animate-isj-footer-zoom"
        />
        <div className="absolute inset-0 bg-slate-950/75" />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950/90" />
      </div>

      <div className="relative min-h-[70vh] flex flex-col">
        <div className="flex-1 flex items-center w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 w-full">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {/* Marque + présentation */}
              <Reveal>
                <div className="space-y-4">
                  <AppLogo size="md" variant="dark" showSubtitle={false} />
                  <p className="text-sm text-slate-300 max-w-md leading-relaxed">
                    Portail académique officiel réservé à la consultation, au téléchargement et au partage des anciennes épreuves de Niveau 1 Ingénieur.
                  </p>
                </div>
              </Reveal>

              {/* Contact */}
              <Reveal delay={0.1}>
                <div className="space-y-4">
                  <h4 className="text-white font-extrabold text-sm tracking-widest uppercase">
                    Contactez-nous
                  </h4>
                  <ul className="space-y-3 text-sm">
                    <li>
                      <a
                        href="tel:+237650897459"
                        className="flex items-center space-x-3 hover:text-white transition-colors"
                      >
                        <Phone className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-bold">+237 6 50 89 74 59</span>
                      </a>
                    </li>
                    <li>
                      <a
                        href="mailto:tchapwouo2005@gmail.com"
                        className="flex items-center space-x-3 hover:text-white transition-colors"
                      >
                        <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="break-all font-semibold">tchapwouo2005@gmail.com</span>
                      </a>
                    </li>
                    <li className="flex items-start space-x-3">
                      <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>Campus d'Eyang, La Lobo, La Lekié</span>
                    </li>
                  </ul>
                  <a
                    href={MAPS_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-2 px-5 py-2.5 border border-white/40 hover:border-amber-400 hover:text-amber-300 text-sky-200 text-sm font-semibold rounded transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>Localisation</span>
                  </a>
                </div>
              </Reveal>

              {/* Liens utiles */}
              <Reveal delay={0.2}>
                <div className="space-y-4">
                  <h4 className="text-white font-extrabold text-sm tracking-widest uppercase">
                    Liens utiles
                  </h4>
                  <ul className="space-y-3 text-sm">
                    {usefulLinks.map((l) => (
                      <li key={l.tab}>
                        <button
                          onClick={() => onNavigate(l.tab)}
                          className="text-slate-200 hover:text-amber-300 transition-colors font-medium"
                        >
                          {l.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>
          </div>
        </div>

        <div className="relative border-t border-white/15">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-center text-xs text-slate-300">
            © 2026 Institut Universitaire Saint Jean. Tous droits réservés.
          </div>
        </div>
      </div>
    </footer>
  );
};
