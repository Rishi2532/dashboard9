import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, LogIn, UserCheck, Wrench, Shield } from "lucide-react";
import { Link, useLocation } from "wouter";
import backgroundImage from "../../../attached_assets/image_1759735212447.png";

import { useAuth } from "@/hooks/use-auth";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Email or Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function EngineerLoginPage() {
  const { toast } = useToast();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginFormValues) => {
      return await login(credentials.username, credentials.password, 'engineer');
    },
    onSuccess: (data) => {
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.name || data.username}`,
      });
      setLoginError(null);
      setLocation("/engineer");
    },
    onError: (error: Error) => {
      setLoginError(error.message);
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    setLoginError(null);
    loginMutation.mutate(values);
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Background with overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-blue-950/80 to-indigo-950/85 backdrop-blur-sm"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Back Link */}
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/login"
            className="inline-flex items-center text-sm font-medium text-blue-200 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Portal Selection
          </Link>
          <img
            src="/images/jal-jeevan-mission-logo.png"
            alt="JJM Logo"
            className="h-10 drop-shadow-md"
          />
        </div>

        <Card className="border-blue-500/20 bg-slate-900/90 backdrop-blur-xl shadow-2xl text-white">
          <CardHeader className="space-y-2 text-center pb-6">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30 mb-2">
              <UserCheck className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-white">
              Engineer Access
            </CardTitle>
            <CardDescription className="text-blue-200/80 text-xs">
              Civil Engineers, Mechanical Engineers &amp; Site Supervisors
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {loginError && (
              <Alert variant="destructive" className="bg-rose-950/60 border-rose-800 text-rose-200">
                <AlertCircle className="h-4 w-4 text-rose-400" />
                <AlertTitle>Authentication Failed</AlertTitle>
                <AlertDescription className="text-xs">{loginError}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-100 text-xs font-semibold">
                        Email, Phone or Username
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. engineer@swsm.gov.in"
                          {...field}
                          className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400"
                        />
                      </FormControl>
                      <FormMessage className="text-rose-400 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-blue-100 text-xs font-semibold">
                        Password
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                          className="bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus:border-cyan-400"
                        />
                      </FormControl>
                      <FormMessage className="text-rose-400 text-xs" />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={loginMutation.isPending}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-2.5 shadow-lg shadow-blue-500/25 transition-all mt-2"
                >
                  {loginMutation.isPending ? (
                    "Signing in..."
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign in to Engineer Portal
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-2 text-center border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center justify-between w-full">
              <Link href="/user-login" className="hover:text-blue-300 transition-colors">
                General User Login
              </Link>
              <Link href="/admin" className="hover:text-blue-300 transition-colors">
                Admin Login
              </Link>
            </div>
            <p className="text-[11px] text-slate-500">
              Only authorized personnel in scheme_engineer_details will have access to their assigned schemes.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
