import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// Demo component to show how the provider information will look
export const ProviderDemo: React.FC = () => {
  const [showFallbackDetails, setShowFallbackDetails] = useState(false);

  // Mock provider display function
  const getProviderDisplay = (provider: string) => {
    const providers: Record<string, { name: string; icon: string; color: string }> = {
      'openai': { name: 'OpenAI', icon: '🤖', color: 'text-green-600' },
      'openrouter': { name: 'OpenRouter', icon: '🔄', color: 'text-blue-600' },
      'gemini': { name: 'Google Gemini', icon: '✨', color: 'text-purple-600' },
      'claude': { name: 'Anthropic Claude', icon: '🧠', color: 'text-orange-600' },
    };
    return providers[provider?.toLowerCase()] || { name: provider, icon: '🤖', color: 'text-gray-600' };
  };

  // Mock fallback scenarios
  const scenarios = [
    {
      title: "Normal Response",
      provider: "openai",
      model: "gpt-4o-mini",
      fallbackUsed: false,
      message: "This is a normal response from OpenAI GPT-4o-mini without any fallback."
    },
    {
      title: "Fallback Response (Quota Exceeded)",
      provider: "openrouter",
      model: "openai/gpt-4o-mini",
      fallbackUsed: true,
      originalProvider: "openai",
      fallbackReason: "quota_exceeded",
      originalModel: "gpt-4o-mini",
      message: "This response was generated after OpenAI quota was exceeded and the system automatically fell back to OpenRouter."
    },
    {
      title: "Fallback Response (Rate Limited)",
      provider: "openrouter",
      model: "anthropic/claude-3.5-sonnet",
      fallbackUsed: true,
      originalProvider: "claude",
      fallbackReason: "rate_limit",
      originalModel: "claude-3-5-sonnet-20241022",
      message: "This response was generated after Claude API rate limit was reached and the system fell back to OpenRouter."
    }
  ];

  const getFallbackReasonDisplay = (reason: string) => {
    const reasons: Record<string, { text: string; icon: JSX.Element; color: string }> = {
      'quota_exceeded': { 
        text: 'OpenAI quota exceeded', 
        icon: <AlertTriangle className="h-3 w-3" />, 
        color: 'text-amber-600' 
      },
      'rate_limit': { 
        text: 'Rate limit reached', 
        icon: <AlertTriangle className="h-3 w-3" />, 
        color: 'text-red-600' 
      },
    };
    return reasons[reason] || { 
      text: reason || 'Unknown error', 
      icon: <AlertTriangle className="h-3 w-3" />, 
      color: 'text-gray-600' 
    };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Provider Display Demo</h1>
        <p className="text-muted-foreground">
          This demonstrates how provider information and fallback details will appear in chat messages.
        </p>
      </div>

      {scenarios.map((scenario, index) => {
        const currentProviderDisplay = getProviderDisplay(scenario.provider);
        const originalProviderDisplay = scenario.originalProvider ? getProviderDisplay(scenario.originalProvider) : null;

        return (
          <Card key={index} className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle className="text-lg">{scenario.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Provider Information */}
              <div className="mb-4">
                {/* Main Provider Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                    "bg-muted/50 border border-muted-foreground/20",
                    currentProviderDisplay.color
                  )}>
                    <span>{currentProviderDisplay.icon}</span>
                    <span>{currentProviderDisplay.name}</span>
                    {scenario.fallbackUsed && (
                      <Zap className="h-3 w-3 text-amber-500" title="Fallback used" />
                    )}
                  </div>
                  
                  {/* Fallback Indicator */}
                  {scenario.fallbackUsed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFallbackDetails(!showFallbackDetails)}
                      className="h-6 px-2 text-xs hover:bg-muted/50 rounded-md"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1 text-amber-500" />
                      <span className="text-amber-600">Fallback used</span>
                      {showFallbackDetails ? (
                        <ChevronUp className="h-3 w-3 ml-1" />
                      ) : (
                        <ChevronDown className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                  )}
                </div>

                {/* Fallback Details - Expandable */}
                {scenario.fallbackUsed && showFallbackDetails && (
                  <div className="bg-muted/30 border border-muted-foreground/10 rounded-lg p-3 text-xs space-y-2">
                    <div className="font-medium text-muted-foreground mb-2">
                      🔄 Fallback Details
                    </div>
                    
                    {/* Original attempt */}
                    {originalProviderDisplay && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span>{originalProviderDisplay.icon}</span>
                          <span>{originalProviderDisplay.name}</span>
                        </div>
                        <span className="text-muted-foreground">→</span>
                        <div className="flex items-center gap-1">
                          {(() => {
                            const reasonDisplay = getFallbackReasonDisplay(scenario.fallbackReason || '');
                            return (
                              <>
                                <span className={reasonDisplay.color}>
                                  {reasonDisplay.icon}
                                </span>
                                <span className={cn("text-xs", reasonDisplay.color)}>
                                  {reasonDisplay.text}
                                </span>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                    
                    {/* Successful fallback */}
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Successfully switched to {currentProviderDisplay.name}</span>
                    </div>
                    
                    {/* Model info */}
                    <div className="text-muted-foreground/80 text-xs">
                      Model: <code className="bg-muted/50 px-1 py-0.5 rounded text-xs">{scenario.model}</code>
                    </div>
                  </div>
                )}
              </div>

              {/* Mock Message */}
              <div className="bg-muted/20 rounded-lg p-3 text-sm">
                {scenario.message}
              </div>

              {/* Mock Usage Stats */}
              <div className="mt-2 text-xs text-muted-foreground/80">
                Tokens: 150 | Cost: $0.0023 | Latency: 1.2s
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default ProviderDemo;
