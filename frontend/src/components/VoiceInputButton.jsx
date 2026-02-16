import { useVoiceInput } from '../hooks/useVoiceInput';

/**
 * Mic button that fills a field via voice. Use with onResult to set form state.
 * @param {Object} props
 * @param {function(string): void} props.onResult - called with transcribed text
 * @param {string} [props.lang='en-IN']
 * @param {boolean} [props.continuous] - keep listening for more segments
 * @param {string} [props.title] - accessibility label
 * @param {string} [props.className]
 */
export function VoiceInputButton({
  onResult,
  lang = 'en-IN',
  continuous = false,
  title = 'Voice input',
  className = '',
}) {
  const { start, listening, supported, error } = useVoiceInput({
    onResult,
    continuous,
    lang,
  });

  if (!supported) {
    return (
      <span className="text-xs text-black/60 ml-2" title="Voice not supported in this browser">
        (Voice: use Chrome/Edge)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={start}
        title={title}
        className={`border-2 border-black px-2 py-1.5 font-semibold text-sm shadow-[2px_2px_0_0_#000] hover:translate-x-0.5 hover:translate-y-0.5 disabled:opacity-70 ${listening ? 'bg-[#FF6B6B] text-white animate-pulse' : 'bg-[#C9B1FF]'} ${className}`}
        aria-label={listening ? 'Listening…' : title}
      >
        {listening ? '🔴 Listening…' : '🎤 Voice'}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
