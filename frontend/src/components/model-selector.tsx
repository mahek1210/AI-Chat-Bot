import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Cpu, Loader2 } from "lucide-react";
import { useModel } from "@/contexts/model-context";

export interface ModelOption {
  value: string;
  label: string;
  provider: string;
}

export const MODEL_OPTIONS: ModelOption[] = [
  { value: "gpt-4o-mini", label: "GPT-4o Mini", provider: "OpenAI" },
  { value: "gpt-4o", label: "GPT-4o", provider: "OpenAI" },
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", provider: "Google" },
  { value: "gemini-2.0-pro", label: "Gemini 2.0 Pro", provider: "Google" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet", provider: "Anthropic" },
  { value: "meta-llama/llama-3-8b-instruct", label: "LLaMA 3 8B", provider: "Meta" },
  { value: "openrouter:claude-3.5-sonnet", label: "Claude 3.5 Sonnet (OpenRouter)", provider: "OpenRouter" },
  { value: "openrouter:llama-3.1-70b", label: "Llama 3.1 70B (OpenRouter)", provider: "OpenRouter" },
  { value: "openrouter:nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super 120B", provider: "OpenRouter" },
  { value: "openrouter:qwen/qwen3-next-80b-a3b-instruct:free", label: "Qwen3 Next 80B Instruct", provider: "OpenRouter" },
  { value: "openrouter:google/gemma-3n-e2b-it:free", label: "Gemma 3n 2B IT", provider: "OpenRouter" },
  { value: "openrouter:nousresearch/hermes-3-llama-3.1-405b:free", label: "Hermes 3 Llama 3.1 405B", provider: "OpenRouter" },
  { value: "openrouter:arcee-ai/maestro-reasoning", label: "Maestro Reasoning", provider: "OpenRouter" },
  { value: "openrouter:mistralai/mistral-small-3.1-24b-instruct:free", label: "Mistral Small 3.1 24B", provider: "OpenRouter" },
  { value: "openrouter:arcee-ai/trinity-large-preview:free", label: "Trinity Large Preview", provider: "OpenRouter" },
  { value: "openrouter/auto", label: "Auto Router", provider: "OpenRouter" },
  { value: "openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free", label: "Dolphin Mistral 24B Venice Edition", provider: "OpenRouter" },
];

export interface ModelSelectorProps {
  onModelChange?: (model: string) => void;
  className?: string;
  loading?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  onModelChange,
  className,
  loading = false,
}) => {
  const { selectedModel, setSelectedModel } = useModel();
  const [supportedModels, setSupportedModels] = useState<string[] | null>(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/models`)
      .then(res => res.json())
      .then(data => {
        if (data.supportedModels) setSupportedModels(data.supportedModels);
      })
      .catch(err => console.error("Failed to fetch models:", err));
  }, []);

  const handleModelSelect = (modelValue: string) => {
    setSelectedModel(modelValue);
    onModelChange?.(modelValue);
  };

  const selectedOption = MODEL_OPTIONS.find(option => option.value === selectedModel);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-8 gap-2 ${className}`}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Cpu className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">{selectedOption?.label}</span>
          <span className="sm:hidden">{selectedOption?.provider}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 max-h-[300px] overflow-y-auto">
        {(supportedModels ? MODEL_OPTIONS.filter(opt => supportedModels.includes(opt.value)) : MODEL_OPTIONS.filter(opt => opt.provider !== "Anthropic" && !opt.value.includes("openrouter:"))).map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleModelSelect(option.value)}
            className="flex items-center justify-between"
          >
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">{option.label}</span>
              <span className="text-xs text-muted-foreground">
                {option.provider}
              </span>
            </div>
            {selectedModel === option.value && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
