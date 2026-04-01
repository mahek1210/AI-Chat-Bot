import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/lib/supabase';
import { Bot, Sparkles } from 'lucide-react';

export function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md z-10">
        {/* Logo & Heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 shadow-lg shadow-primary/30 mb-4">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Welcome Back</h1>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Sign in to chat with your AI personas
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-6">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary))',
                    brandButtonText: 'hsl(var(--primary-foreground))',
                    defaultButtonBackground: 'hsl(var(--muted))',
                    defaultButtonBackgroundHover: 'hsl(var(--muted))',
                    inputBackground: 'hsl(var(--background))',
                    inputBorder: 'hsl(var(--border))',
                    inputBorderFocus: 'hsl(var(--primary))',
                    inputText: 'hsl(var(--foreground))',
                    inputLabelText: 'hsl(var(--muted-foreground))',
                    inputPlaceholder: 'hsl(var(--muted-foreground))',
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '0.5rem',
                    buttonBorderRadius: '0.5rem',
                    inputBorderRadius: '0.5rem',
                  },
                  space: {
                    inputPadding: '0.75rem',
                    buttonPadding: '0.75rem',
                  },
                },
              },
              className: {
                container: 'supabase-auth-container',
                button: 'supabase-auth-btn',
                input: 'supabase-auth-input',
              },
            }}
            providers={['google', 'github']}
            socialLayout="horizontal"
            redirectTo={`${window.location.origin}/chat`}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email Address',
                  password_label: 'Password',
                  button_label: 'Sign In',
                  social_provider_text: 'Continue with {{provider}}',
                },
                sign_up: {
                  email_label: 'Email Address',
                  password_label: 'Create Password',
                  button_label: 'Create Account',
                  social_provider_text: 'Continue with {{provider}}',
                },
              },
            }}
          />
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
