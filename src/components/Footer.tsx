import React from "react";
import { BookOpen } from "lucide-react";
import { AppLogo } from "./AppLogo";

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Col 1 */}
          <div className="space-y-3 md:col-span-2">
            <AppLogo size="md" variant="dark" showSubtitle={false} />
            <p className="text-xs text-slate-400 max-w-md leading-relaxed">
              Portail académique officiel réservé à la consultation, au téléchargement et au partage des anciennes épreuves de Niveau 1 Ingénieur.
            </p>
          </div>

          {/* Col 2 */}
          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs tracking-widest uppercase">
              Arborescence
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li>Niveau 1 Ingénieur</li>
              <li>Semestre 1 (S1) & Semestre 2 (S2)</li>
              <li>Contrôles Continus (CC)</li>
              <li>Sessions Normales (SN)</li>
              <li>Sessions Rattrapage (SR)</li>
            </ul>
          </div>

          {/* Col 3 */}
          <div className="space-y-2">
            <h4 className="text-white font-bold text-xs tracking-widest uppercase">
              Support & Contact
            </h4>
            <p className="text-xs text-slate-400">
              Institut Universitaire Saint Jean Ingénieur
              <br />
              Yaoundé - Cameroun
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center space-x-1.5 text-[10px] text-slate-300 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700 uppercase font-medium">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Revisio - Version 1.0</span>
              </span>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-3">
          <p>© 2026 Institut Universitaire Saint Jean. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  );
};
