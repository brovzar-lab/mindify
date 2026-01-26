import { useNavigate } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { useHaptic } from '@/hooks/use-haptic';

export function CaptureFab() {
  const navigate = useNavigate();
  const haptic = useHaptic();

  const handlePress = () => {
    haptic.light();
    navigate('/');
  };

  return (
    <button
      onClick={handlePress}
      className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-[#1A1A1A] shadow-lg flex items-center justify-center z-20 active:scale-95 transition-transform"
      aria-label="Capture a thought"
    >
      <Mic className="w-6 h-6 text-white" strokeWidth={1.5} />
    </button>
  );
}
