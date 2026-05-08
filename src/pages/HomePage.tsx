import { useNavigate } from "react-router-dom";
import HeroSection from "@/components/HeroSection";

/**
 * HomePage — rendered at route "/"
 *
 * Thin page wrapper. All visual content lives in HeroSection;
 * this layer only handles navigation via React Router.
 */
const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <HeroSection
        onStartRecording={() => navigate("/record")}
        onKnowYourRights={() => navigate("/chat")}
      />
    </div>
  );
};

export default HomePage;
