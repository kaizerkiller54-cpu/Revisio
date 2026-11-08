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

const WhatsAppIcon: React.FC<{ className?: string }> = ({
  className = "w-4 h-4",
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.888 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="relative overflow-hidden text-slate-200">
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
                        href="https://wa.me/237650897459?text=Bonjour%20Revisio%2C%20je%20vous%20contacte%20concernant%20les%20%C3%A9preuves%20de%20Niveau%201"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center space-x-3 hover:text-white transition-colors cursor-pointer"
                        title="Écrire un message sur WhatsApp (+237 6 50 89 74 59)"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                        <span className="font-bold group-hover:text-emerald-300 transition-colors">
                          +237 6 50 89 74 59
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          WhatsApp
                        </span>
                      </a>
                    </li>
                    <li>
                      <a
                        href="https://wa.me/237658965383?text=Bonjour%20Revisio%2C%20je%20vous%20contacte%20concernant%20les%20%C3%A9preuves%20de%20Niveau%201"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center space-x-3 hover:text-white transition-colors cursor-pointer"
                        title="Écrire un message sur WhatsApp (+237 658 96 53 83)"
                      >
                        <WhatsAppIcon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform shrink-0" />
                        <span className="font-bold group-hover:text-emerald-300 transition-colors">
                          +237 658 96 53 83
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                          WhatsApp
                        </span>
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
                    <li>
                      <a
                        href="mailto:dylanessomba2009@gmail.com"
                        className="flex items-center space-x-3 hover:text-white transition-colors"
                      >
                        <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="break-all">dylanessomba2009@gmail.com</span>
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
