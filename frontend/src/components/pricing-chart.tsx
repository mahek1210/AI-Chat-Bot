import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DollarSign } from "lucide-react";
import { MODEL_OPTIONS } from "./model-selector";

// This mimics the pricing backend PRICING_TABLE mapped to UI format
const MODEL_PRICING: Record<string, { inputMilli: number, outputMilli: number }> = {
  // OpenAI
  "gpt-4o": { inputMilli: 5.0, outputMilli: 15.0 },
  "gpt-4o-mini": { inputMilli: 0.15, outputMilli: 0.60 },

  // Google Gemini
  "gemini-2.5-flash": { inputMilli: 0.075, outputMilli: 0.30 },
  "gemini-2.0-flash": { inputMilli: 3.75, outputMilli: 15.0 },
  "gemini-2.0-pro": { inputMilli: 15.0, outputMilli: 75.0 }, // Approx guess based on hierarchy

  // Anthropic Claude
  "claude-3-5-sonnet-20241022": { inputMilli: 3.0, outputMilli: 15.0 },
  "openrouter:claude-3.5-sonnet": { inputMilli: 3.0, outputMilli: 15.0 },

  // Meta Llama 
  "meta-llama/llama-3-8b-instruct": { inputMilli: 0.20, outputMilli: 0.40 },
  "openrouter:llama-3.1-70b": { inputMilli: 0.60, outputMilli: 1.20 },

  // OpenRouter custom fallback
  "openrouter:nvidia/nemotron-3-super-120b-a12b:free": { inputMilli: 2.0, outputMilli: 4.0 },
  "openrouter:qwen/qwen3-next-80b-a3b-instruct:free": { inputMilli: 1.0, outputMilli: 2.0 },
  "openrouter:google/gemma-3n-e2b-it:free": { inputMilli: 0.50, outputMilli: 1.0 },
  "openrouter:nousresearch/hermes-3-llama-3.1-405b:free": { inputMilli: 3.0, outputMilli: 6.0 },
  "openrouter:arcee-ai/maestro-reasoning": { inputMilli: 4.0, outputMilli: 4.0 },
  "openrouter:mistralai/mistral-small-3.1-24b-instruct:free": { inputMilli: 1.0, outputMilli: 2.0 },
  "openrouter:arcee-ai/trinity-large-preview:free": { inputMilli: 1.0, outputMilli: 2.0 },
  "openrouter/auto": { inputMilli: 1.0, outputMilli: 2.0 },
  "openrouter:cognitivecomputations/dolphin-mistral-24b-venice-edition:free": { inputMilli: 1.0, outputMilli: 2.0 },
};

export const PricingChartDialog = () => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2">
          <DollarSign className="h-3 w-3" />
          <span>Pricing List</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Token Pricing Chart</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Prices are listed per 1 million tokens (USD). Our platform utilizes a specialized auto-routing system across top models.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 pr-2">
          <div className="rounded-md border">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 font-medium">Model Name</th>
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium text-right">Input / 1M Tokens</th>
                  <th className="px-4 py-3 font-medium text-right">Output / 1M Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {MODEL_OPTIONS.map((option) => {
                  const pricing = MODEL_PRICING[option.value] || { inputMilli: 0.50, outputMilli: 1.50 };
                  
                  return (
                    <tr key={option.value} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {option.label}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {option.provider}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${pricing.inputMilli.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        ${pricing.outputMilli.toFixed(2)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
