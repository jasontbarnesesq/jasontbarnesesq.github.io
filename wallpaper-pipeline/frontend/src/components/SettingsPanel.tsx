export interface Settings {
  cropMode: "cover" | "pad";
  denoise: number;
  model: "x4plus" | "x4plus_anime";
}

interface Props {
  settings: Settings;
  disabled?: boolean;
  onChange: (settings: Settings) => void;
}

export default function SettingsPanel({ settings, disabled, onChange }: Props) {
  return (
    <fieldset className="settings" disabled={disabled}>
      <label>
        Fit mode
        <select
          value={settings.cropMode}
          onChange={(e) => onChange({ ...settings, cropMode: e.target.value as Settings["cropMode"] })}
        >
          <option value="cover">Cover (center-crop to 64:27)</option>
          <option value="pad">Pad (letterbox to 64:27)</option>
        </select>
      </label>

      <label>
        Denoise strength: {settings.denoise.toFixed(2)}
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.denoise}
          onChange={(e) => onChange({ ...settings, denoise: Number(e.target.value) })}
        />
      </label>

      <label>
        Model
        <select
          value={settings.model}
          onChange={(e) => onChange({ ...settings, model: e.target.value as Settings["model"] })}
        >
          <option value="x4plus">Real-ESRGAN x4plus (photo)</option>
          <option value="x4plus_anime">Real-ESRGAN x4plus anime</option>
        </select>
      </label>
    </fieldset>
  );
}
