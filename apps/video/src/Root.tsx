import "./index.css";
import { Composition } from "remotion";
import { InstitutionalVideo } from "./InstitutionalVideo";
import { Scene1Hero } from "./InstitutionalVideo/Scene1Hero";
import { Scene2OCR } from "./InstitutionalVideo/Scene2OCR";
import { Scene3Engineering } from "./InstitutionalVideo/Scene3Engineering";
import { Scene4WhatsAppCRM } from "./InstitutionalVideo/Scene4WhatsAppCRM";
import { Scene5ProposalFinance } from "./InstitutionalVideo/Scene5ProposalFinance";
import { Scene6CTA } from "./InstitutionalVideo/Scene6CTA";
import { VideoBackground } from "./InstitutionalVideo/Background";

// Wrapper for individual scene preview with background
const ScenePreview: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <div style={{ position: "relative", width: "100%", height: "100%" }}>
    <VideoBackground />
    {children}
  </div>
);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Principal: Vídeo Institucional Completo EnergivIA (30s) */}
      <Composition
        id="EnergiviaInstitucional"
        component={InstitutionalVideo}
        durationInFrames={900}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* Cenas Individuais para edição e preview detalhado no Remotion Studio */}
      <Composition
        id="Cena1-Hero"
        component={() => (
          <ScenePreview>
            <Scene1Hero />
          </ScenePreview>
        )}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="Cena2-OCR-Fatura"
        component={() => (
          <ScenePreview>
            <Scene2OCR />
          </ScenePreview>
        )}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="Cena3-Dimensionamento"
        component={() => (
          <ScenePreview>
            <Scene3Engineering />
          </ScenePreview>
        )}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="Cena4-WhatsApp-CRM"
        component={() => (
          <ScenePreview>
            <Scene4WhatsAppCRM />
          </ScenePreview>
        )}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="Cena5-Proposta-Financiamento"
        component={() => (
          <ScenePreview>
            <Scene5ProposalFinance />
          </ScenePreview>
        )}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />

      <Composition
        id="Cena6-Resultados-CTA"
        component={() => (
          <ScenePreview>
            <Scene6CTA />
          </ScenePreview>
        )}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
