import { useNavigate } from "react-router-dom";
import RecordingInterface from "@/components/RecordingInterface";

/**
 * RecordingPage — rendered at route "/record"
 *
 * Thin page wrapper. All recording logic lives in RecordingInterface;
 * this layer only connects the onBack prop to React Router navigation.
 */
const RecordingPage = () => {
  const navigate = useNavigate();

  return <RecordingInterface onBack={() => navigate("/")} />;
};

export default RecordingPage;
