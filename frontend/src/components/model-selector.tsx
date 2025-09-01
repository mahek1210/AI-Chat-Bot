import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown, Cpu } from "lucide-react";
import { useModel } from "@/contexts/model-context";

export interface ModelOption {
  value: string;
  label: string;
  provider: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  {
    value: "gpt-4o-mini",
    label: "GPT-4o Mini",
    provider: "OpenAI",
  },
  {
    value: "gpt-4o",
    label: "GPT-4o",
    provider: "OpenAI",
  },
  {
    value: "gemini-1.5-flash",
    label: "Gemini 1.5 Flash",
    provider: "Google",
  },
  {
    value: "gemini-1.5-pro",
    label: "Gemini 1.5 Pro",
    provider: "Google",
  },
  {
    value: "claude-3-5-sonnet-20241022",
    label: "Claude 3.5 Sonnet",
    provider: "Anthropic",
  },
  {
    value: "meta-llama/llama-3-8b-instruct",
    label: "LLaMA 3 8B",
    provider: "Meta",
  },
  {
    value: "openrouter:claude-3.5-sonnet",
    label: "Claude 3.5 Sonnet (OpenRouter)",
    provider: "OpenRouter",
  },
  {
    value: "openrouter:llama-3.1-70b",
    label: "Llama 3.1 70B (OpenRouter)",
    provider: "OpenRouter",
  },
];

export interface ModelSelectorProps {
  onModelChange?: (model: string) => void;
  className?: string;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  onModelChange,
  className,
}) => {
  const { selectedModel, setSelectedModel } = useModel();

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
        >
          <Cpu className="h-3 w-3" />
          <span className="hidden sm:inline">{selectedOption?.label}</span>
          <span className="sm:hidden">{selectedOption?.provider}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {MODEL_OPTIONS.map((option) => (
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
