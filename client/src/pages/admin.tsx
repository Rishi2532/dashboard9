import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { AlertCircle, LockIcon, LogIn, ArrowLeft } from "lucide-react";
import backgroundImage from "../../../attached_assets/image_1759735212447.png";

// Login form schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Auth status response type
interface AuthStatusResponse {
  isLoggedIn: boolean;
  isAdmin: boolean;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [loginError, setLoginError] = useState<string | null>(null);

  // Check if user is already logged in
  const authStatusQuery = useQuery<AuthStatusResponse>({
    queryKey: ["/api/auth/status"],
    refetchOnWindowFocus: false,
  });

  // Redirect to appropriate dashboard if already logged in
  if (authStatusQuery.data?.isLoggedIn) {
    if (authStatusQuery.data?.isAdmin) {
      window.location.href = "/admin/dashboard";
    } else {
      // Normal users trying to access admin login page get sent to their dashboard
      window.location.href = "/dashboard";
    }
    return null;
  }

  // Login form setup
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
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Login failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Check if the user is an admin
      if (data.role !== "admin") {
        setLoginError(
          "You are not authorized to access the admin panel. This login is for administrators only.",
        );

        // Log out the non-admin user who tried to log in
        fetch("/api/auth/logout", { method: "POST" });

        return;
      }

      toast({
        title: "Login successful",
        description: "You are now logged in as admin",
      });
      setLoginError(null);
      // Redirect to admin dashboard
      window.location.href = "/admin/dashboard";
    },
    onError: (error: Error) => {
      setLoginError(error.message);
      console.error("Login error:", error);
    },
  });

  // Form submission handler
  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate(data);
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
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 md:top-6 md:left-6">
          <img
            src="/images/jal-jeevan-mission-logo.png"
            alt="Har Ghar Jal - Jal Jeevan Mission"
            className="h-12 sm:h-16 md:h-20 drop-shadow-2xl"
          />
        </div>

        <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-16 sm:py-4">
          <Card className="w-full max-w-md shadow-2xl border border-white/40 bg-white/95 backdrop-blur-lg">
            <CardHeader className="space-y-1 p-4 sm:p-6">
              <div className="flex items-center justify-center mb-2">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center shadow-xl">
                  <LockIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-xl sm:text-2xl font-bold text-center text-blue-900">
                Admin Login
              </CardTitle>
              <CardDescription className="text-center text-blue-700 text-sm">
                Enter your credentials to access the admin dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
              {loginError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Authentication Failed</AlertTitle>
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-800">Username</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your admin username"
                            {...field}
                            className="border-blue-200 focus-visible:ring-blue-500"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-blue-800">Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Enter your password"
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
                    className="w-full bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 py-5 text-lg mt-2"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <div className="flex items-center justify-center">
                        <svg
                          className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Logging in...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <LogIn className="mr-2 h-5 w-5" />
                        Login to Admin Panel
                      </div>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="bg-blue-50/50 border-t border-blue-100 py-3 flex justify-center">
              <a
                href="/"
                className="text-sm text-blue-700 hover:text-blue-900 hover:underline flex items-center font-medium"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Login Selection
              </a>
            </CardFooter>
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
