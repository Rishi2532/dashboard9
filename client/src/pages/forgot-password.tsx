import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { 
  Card
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import backgroundImage from "../../../attached_assets/image_1759735212447.png";

// Forgot password form schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);
  const [, setLocation] = useLocation();
  
  // Form setup
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    }
  });

  // Password reset mutation
  const resetMutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormValues) => {
      // Normally would make API call here
      // This is just a placeholder for now
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({ success: true });
        }, 1500);
      });
    },
    onSuccess: () => {
      setResetSuccess(true);
      setResetError(null);
      form.reset();
    },
    onError: (error: Error) => {
      setResetError(error.message);
      setResetSuccess(false);
    }
  });

  // Form submission handler
  const onSubmit = (data: ForgotPasswordFormValues) => {
    resetMutation.mutate(data);
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image with Light Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/25 via-blue-800/20 to-indigo-900/25"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header Logo */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6">
          <img
            src="/images/jal-jeevan-mission-logo.png"
            alt="Har Ghar Jal - Jal Jeevan Mission"
            className="h-16 md:h-20 drop-shadow-2xl"
          />
        </div>
        
        <div className="flex-1 flex items-center justify-center px-4">
          <Card className="w-full max-w-md shadow-2xl border border-white/40 bg-white/95 backdrop-blur-lg">
            <div className="p-8">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-blue-400 flex items-center justify-center mx-auto mb-3 shadow-xl">
                  <KeyRound className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-blue-900">
                  Reset Password
                </h1>
                <p className="text-blue-600 text-sm mt-1">Enter your email to receive reset instructions</p>
              </div>
              
              {resetError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{resetError}</AlertDescription>
                </Alert>
              )}
              
              {resetSuccess ? (
                <div className="text-center space-y-4">
                  <Alert className="mb-4 bg-green-50 border-green-200">
                    <AlertTitle className="text-green-800">Email Sent</AlertTitle>
                    <AlertDescription className="text-green-700">
                      If an account exists with that email, you will receive password reset instructions.
                    </AlertDescription>
                  </Alert>
                  <Button 
                    className="mt-4 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 w-full"
                    onClick={() => setLocation('/login')}
                  >
                    Return to Login
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-blue-800 font-medium">Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your email address" 
                              type="email"
                              {...field} 
                              className="border-blue-200 focus-visible:ring-blue-500"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 py-5 mt-2"
                      disabled={resetMutation.isPending}
                    >
                      {resetMutation.isPending ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </form>
                </Form>
              )}
              
              <div className="mt-4 text-sm text-center">
                <Link href="/login" className="text-blue-700 hover:text-blue-900 font-medium hover:underline flex items-center justify-center">
                  <ArrowLeft className="w-4 w-4 mr-1" />
                  Back to Login
                </Link>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Footer */}
        <footer className="relative z-10 py-4 border-t border-white/30 backdrop-blur-sm">
          <div className="text-center">
            <p className="text-sm text-white font-medium drop-shadow">
              Powered by CSTECH AI
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
