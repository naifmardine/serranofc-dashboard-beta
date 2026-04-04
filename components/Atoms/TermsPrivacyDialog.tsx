"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

type Tab = "termos" | "privacidade";

type TermsPrivacyDialogProps = {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
};

export default function TermsPrivacyDialog({
  open,
  onClose,
  initialTab = "termos",
}: TermsPrivacyDialogProps) {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  if (!open) return null;

  const tp = t.termosPrivacidade;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />

      <div className="relative w-[94%] max-w-[640px] max-h-[85vh] rounded-2xl bg-white shadow-[0_20px_60px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <h2 className="text-lg font-bold text-slate-900">{tp.titulo}</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg grid place-items-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-4 pb-0">
          <button
            type="button"
            onClick={() => setTab("termos")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === "termos"
                ? "border-[#003399] text-[#003399] bg-blue-50/60"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tp.termosDeUso}
          </button>
          <button
            type="button"
            onClick={() => setTab("privacidade")}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === "privacidade"
                ? "border-[#003399] text-[#003399] bg-blue-50/60"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
          >
            {tp.politicaPrivacidade}
          </button>
        </div>

        <div className="h-px bg-gray-200 mx-6" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm text-gray-700 leading-relaxed">
          {tab === "termos" ? (
            <TermosContent locale={locale} tp={tp} />
          ) : (
            <PrivacidadeContent locale={locale} tp={tp} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-5 py-2 text-sm font-semibold bg-[#003399] text-white hover:bg-[#002774] transition-colors"
          >
            {tp.fechar}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="font-semibold text-slate-800 mt-5 mb-2 first:mt-0">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-3">{children}</p>;
}

function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>;
}

/* ------------------------------------------------------------------ */

function TermosContent({ locale, tp }: { locale: string; tp: any }) {
  if (locale === "en") {
    return (
      <>
        <P>{tp.termosAtualizacao}</P>

        <SectionTitle>1. {tp.t1Title}</SectionTitle>
        <P>
          This platform (&quot;Serrano FC Dashboard&quot;) is a private management tool operated by
          Serrano Football Club for the administration of players, clubs, transfers, and sports
          analytics. Access is granted exclusively by system administrators.
        </P>

        <SectionTitle>2. {tp.t2Title}</SectionTitle>
        <Ul>
          <li>Access the platform only through the credentials assigned to you.</li>
          <li>Do not share your login credentials with third parties.</li>
          <li>Use the data and features exclusively for professional purposes related to Serrano FC.</li>
          <li>Do not copy, export, or distribute player information, reports, or analytics to unauthorized parties.</li>
        </Ul>

        <SectionTitle>3. {tp.t3Title}</SectionTitle>
        <P>
          All content available on the platform — including data, reports, analyses, visual identity,
          and source code — is the property of Serrano Football Club and/or its partners. Reproduction,
          distribution, or commercial use without prior written authorization is prohibited.
        </P>

        <SectionTitle>4. {tp.t4Title}</SectionTitle>
        <P>
          The player and club information displayed on the platform is for internal management
          purposes. Serrano FC makes every effort to keep the data accurate but does not guarantee
          that all information is complete or up to date at all times. Decisions based on the data
          are the sole responsibility of the user.
        </P>

        <SectionTitle>5. {tp.t5Title}</SectionTitle>
        <P>
          Serrano FC reserves the right to suspend or revoke access for any user who violates these
          terms, misuses the platform, or compromises the security and confidentiality of the
          information contained herein.
        </P>

        <SectionTitle>6. {tp.t6Title}</SectionTitle>
        <P>
          These terms may be updated at any time. Continued use of the platform after changes
          constitutes acceptance of the new terms.
        </P>
      </>
    );
  }

  if (locale === "es") {
    return (
      <>
        <P>{tp.termosAtualizacao}</P>

        <SectionTitle>1. {tp.t1Title}</SectionTitle>
        <P>
          Esta plataforma (&quot;Serrano FC Dashboard&quot;) es una herramienta privada de gestión
          operada por Serrano Football Club para la administración de jugadores, clubes,
          transferencias y análisis deportivo. El acceso se concede exclusivamente por los
          administradores del sistema.
        </P>

        <SectionTitle>2. {tp.t2Title}</SectionTitle>
        <Ul>
          <li>Acceder a la plataforma únicamente con las credenciales que le fueron asignadas.</li>
          <li>No compartir sus credenciales de acceso con terceros.</li>
          <li>Utilizar los datos y funcionalidades exclusivamente para fines profesionales relacionados con Serrano FC.</li>
          <li>No copiar, exportar ni distribuir información de jugadores, informes o análisis a personas no autorizadas.</li>
        </Ul>

        <SectionTitle>3. {tp.t3Title}</SectionTitle>
        <P>
          Todo el contenido disponible en la plataforma — incluyendo datos, informes, análisis,
          identidad visual y código fuente — es propiedad de Serrano Football Club y/o sus socios.
          Queda prohibida la reproducción, distribución o uso comercial sin autorización previa por
          escrito.
        </P>

        <SectionTitle>4. {tp.t4Title}</SectionTitle>
        <P>
          La información de jugadores y clubes presentada en la plataforma es para fines de gestión
          interna. Serrano FC se esfuerza por mantener los datos precisos, pero no garantiza que toda
          la información esté completa o actualizada en todo momento. Las decisiones basadas en los
          datos son responsabilidad exclusiva del usuario.
        </P>

        <SectionTitle>5. {tp.t5Title}</SectionTitle>
        <P>
          Serrano FC se reserva el derecho de suspender o revocar el acceso de cualquier usuario que
          viole estos términos, haga mal uso de la plataforma o comprometa la seguridad y
          confidencialidad de la información contenida.
        </P>

        <SectionTitle>6. {tp.t6Title}</SectionTitle>
        <P>
          Estos términos pueden actualizarse en cualquier momento. El uso continuado de la plataforma
          después de los cambios constituye la aceptación de los nuevos términos.
        </P>
      </>
    );
  }

  // PT (default)
  return (
    <>
      <P>{tp.termosAtualizacao}</P>

      <SectionTitle>1. {tp.t1Title}</SectionTitle>
      <P>
        Esta plataforma (&quot;Serrano FC Dashboard&quot;) é uma ferramenta privada de gestão operada
        pelo Serrano Football Club para a administração de jogadores, clubes, transferências e
        análises esportivas. O acesso é concedido exclusivamente pelos administradores do sistema.
      </P>

      <SectionTitle>2. {tp.t2Title}</SectionTitle>
      <Ul>
        <li>Acessar a plataforma apenas com as credenciais que lhe foram atribuídas.</li>
        <li>Não compartilhar suas credenciais de acesso com terceiros.</li>
        <li>Utilizar os dados e funcionalidades exclusivamente para fins profissionais relacionados ao Serrano FC.</li>
        <li>Não copiar, exportar ou distribuir informações de jogadores, relatórios ou análises para pessoas não autorizadas.</li>
      </Ul>

      <SectionTitle>3. {tp.t3Title}</SectionTitle>
      <P>
        Todo o conteúdo disponível na plataforma — incluindo dados, relatórios, análises, identidade
        visual e código-fonte — é de propriedade do Serrano Football Club e/ou seus parceiros. É
        proibida a reprodução, distribuição ou uso comercial sem autorização prévia por escrito.
      </P>

      <SectionTitle>4. {tp.t4Title}</SectionTitle>
      <P>
        As informações de jogadores e clubes exibidas na plataforma são para fins de gestão interna.
        O Serrano FC se esforça para manter os dados precisos, mas não garante que todas as
        informações estejam completas ou atualizadas em todos os momentos. Decisões tomadas com base
        nos dados são de responsabilidade exclusiva do usuário.
      </P>

      <SectionTitle>5. {tp.t5Title}</SectionTitle>
      <P>
        O Serrano FC se reserva o direito de suspender ou revogar o acesso de qualquer usuário que
        viole estes termos, faça mau uso da plataforma ou comprometa a segurança e confidencialidade
        das informações contidas.
      </P>

      <SectionTitle>6. {tp.t6Title}</SectionTitle>
      <P>
        Estes termos podem ser atualizados a qualquer momento. O uso continuado da plataforma após as
        alterações constitui a aceitação dos novos termos.
      </P>
    </>
  );
}

/* ------------------------------------------------------------------ */

function PrivacidadeContent({ locale, tp }: { locale: string; tp: any }) {
  if (locale === "en") {
    return (
      <>
        <P>{tp.privacidadeAtualizacao}</P>

        <SectionTitle>1. {tp.p1Title}</SectionTitle>
        <P>
          When registering and using the platform, the following personal data is collected:
        </P>
        <Ul>
          <li>Full name and email address (for authentication and identification).</li>
          <li>Hashed password (stored securely; we never have access to your plain-text password).</li>
          <li>Access role (Administrator or Client).</li>
        </Ul>

        <SectionTitle>2. {tp.p2Title}</SectionTitle>
        <P>Your personal data is used exclusively to:</P>
        <Ul>
          <li>Authenticate your access to the platform.</li>
          <li>Identify users within the system for auditing and management purposes.</li>
          <li>Ensure role-based access control to features and data.</li>
        </Ul>
        <P>
          We do not use your data for marketing purposes, nor do we share it with third parties.
        </P>

        <SectionTitle>3. {tp.p3Title}</SectionTitle>
        <P>
          The platform manages information about football players, including personal data, contract
          details, market values, statistics, and media. This data is used solely for internal sports
          management by Serrano FC and is treated as confidential.
        </P>

        <SectionTitle>4. {tp.p4Title}</SectionTitle>
        <Ul>
          <li>Authentication is handled via encrypted JWT tokens stored in secure httpOnly cookies.</li>
          <li>Passwords are hashed using bcrypt before being stored in the database.</li>
          <li>All communications between the browser and the server use HTTPS encryption.</li>
          <li>Access to the platform is restricted by middleware that verifies authentication on every request.</li>
        </Ul>

        <SectionTitle>5. {tp.p5Title}</SectionTitle>
        <P>
          Player images may be stored using third-party cloud services (Cloudinary). These services
          have their own privacy policies and are used solely for hosting media assets.
        </P>

        <SectionTitle>6. {tp.p6Title}</SectionTitle>
        <P>
          Your data is retained for as long as your account is active on the platform. If your account
          is removed by an administrator, your personal data is deleted from the system.
        </P>

        <SectionTitle>7. {tp.p7Title}</SectionTitle>
        <P>
          This privacy policy may be updated at any time. We recommend periodically reviewing this
          section. Continued use of the platform constitutes acceptance of the current policy.
        </P>
      </>
    );
  }

  if (locale === "es") {
    return (
      <>
        <P>{tp.privacidadeAtualizacao}</P>

        <SectionTitle>1. {tp.p1Title}</SectionTitle>
        <P>
          Al registrarse y utilizar la plataforma, se recopilan los siguientes datos personales:
        </P>
        <Ul>
          <li>Nombre completo y dirección de correo electrónico (para autenticación e identificación).</li>
          <li>Contraseña encriptada (almacenada de forma segura; nunca tenemos acceso a su contraseña en texto plano).</li>
          <li>Rol de acceso (Administrador o Cliente).</li>
        </Ul>

        <SectionTitle>2. {tp.p2Title}</SectionTitle>
        <P>Sus datos personales se utilizan exclusivamente para:</P>
        <Ul>
          <li>Autenticar su acceso a la plataforma.</li>
          <li>Identificar usuarios dentro del sistema con fines de auditoría y gestión.</li>
          <li>Garantizar el control de acceso basado en roles a funcionalidades y datos.</li>
        </Ul>
        <P>
          No utilizamos sus datos con fines de marketing ni los compartimos con terceros.
        </P>

        <SectionTitle>3. {tp.p3Title}</SectionTitle>
        <P>
          La plataforma gestiona información sobre jugadores de fútbol, incluyendo datos personales,
          detalles contractuales, valores de mercado, estadísticas y medios. Estos datos se utilizan
          exclusivamente para la gestión deportiva interna del Serrano FC y se tratan como
          confidenciales.
        </P>

        <SectionTitle>4. {tp.p4Title}</SectionTitle>
        <Ul>
          <li>La autenticación se realiza mediante tokens JWT encriptados almacenados en cookies httpOnly seguras.</li>
          <li>Las contraseñas se encriptan con bcrypt antes de almacenarse en la base de datos.</li>
          <li>Todas las comunicaciones entre el navegador y el servidor utilizan cifrado HTTPS.</li>
          <li>El acceso a la plataforma está restringido por middleware que verifica la autenticación en cada solicitud.</li>
        </Ul>

        <SectionTitle>5. {tp.p5Title}</SectionTitle>
        <P>
          Las imágenes de jugadores pueden almacenarse en servicios de nube de terceros (Cloudinary).
          Estos servicios tienen sus propias políticas de privacidad y se utilizan únicamente para
          alojar archivos de medios.
        </P>

        <SectionTitle>6. {tp.p6Title}</SectionTitle>
        <P>
          Sus datos se conservan mientras su cuenta esté activa en la plataforma. Si un administrador
          elimina su cuenta, sus datos personales se eliminan del sistema.
        </P>

        <SectionTitle>7. {tp.p7Title}</SectionTitle>
        <P>
          Esta política de privacidad puede actualizarse en cualquier momento. Recomendamos revisar
          periódicamente esta sección. El uso continuado de la plataforma constituye la aceptación
          de la política vigente.
        </P>
      </>
    );
  }

  // PT (default)
  return (
    <>
      <P>{tp.privacidadeAtualizacao}</P>

      <SectionTitle>1. {tp.p1Title}</SectionTitle>
      <P>
        Ao se cadastrar e utilizar a plataforma, os seguintes dados pessoais são coletados:
      </P>
      <Ul>
        <li>Nome completo e endereço de e-mail (para autenticação e identificação).</li>
        <li>Senha criptografada (armazenada de forma segura; nunca temos acesso à sua senha em texto plano).</li>
        <li>Papel de acesso (Administrador ou Cliente).</li>
      </Ul>

      <SectionTitle>2. {tp.p2Title}</SectionTitle>
      <P>Seus dados pessoais são utilizados exclusivamente para:</P>
      <Ul>
        <li>Autenticar seu acesso à plataforma.</li>
        <li>Identificar usuários dentro do sistema para fins de auditoria e gestão.</li>
        <li>Garantir o controle de acesso baseado em perfis às funcionalidades e dados.</li>
      </Ul>
      <P>
        Não utilizamos seus dados para fins de marketing nem os compartilhamos com terceiros.
      </P>

      <SectionTitle>3. {tp.p3Title}</SectionTitle>
      <P>
        A plataforma gerencia informações sobre jogadores de futebol, incluindo dados pessoais,
        detalhes contratuais, valores de mercado, estatísticas e mídias. Esses dados são utilizados
        exclusivamente para a gestão esportiva interna do Serrano FC e são tratados como
        confidenciais.
      </P>

      <SectionTitle>4. {tp.p4Title}</SectionTitle>
      <Ul>
        <li>A autenticação é feita por meio de tokens JWT criptografados armazenados em cookies httpOnly seguros.</li>
        <li>As senhas são criptografadas com bcrypt antes de serem armazenadas no banco de dados.</li>
        <li>Todas as comunicações entre o navegador e o servidor utilizam criptografia HTTPS.</li>
        <li>O acesso à plataforma é restrito por middleware que verifica a autenticação em cada requisição.</li>
      </Ul>

      <SectionTitle>5. {tp.p5Title}</SectionTitle>
      <P>
        Imagens de jogadores podem ser armazenadas em serviços de nuvem de terceiros (Cloudinary).
        Esses serviços possuem suas próprias políticas de privacidade e são utilizados apenas para
        hospedagem de arquivos de mídia.
      </P>

      <SectionTitle>6. {tp.p6Title}</SectionTitle>
      <P>
        Seus dados são mantidos enquanto sua conta estiver ativa na plataforma. Caso sua conta seja
        removida por um administrador, seus dados pessoais são excluídos do sistema.
      </P>

      <SectionTitle>7. {tp.p7Title}</SectionTitle>
      <P>
        Esta política de privacidade pode ser atualizada a qualquer momento. Recomendamos a revisão
        periódica desta seção. O uso continuado da plataforma constitui a aceitação da política
        vigente.
      </P>
    </>
  );
}
