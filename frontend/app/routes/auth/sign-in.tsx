import { signInSchema } from "@/lib/schema";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router";
import { useLoginMutation } from "@/hooks/use-Auth";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/provider/auth-context";

type SignInFormData = z.infer<typeof signInSchema>;

const SignIn = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { mutate, isPending } = useLoginMutation();

  const handleOnSubmit = (values: SignInFormData) => {
    mutate(values, {
      onSuccess: async (data) => {
        await login(data);
        toast.success("Login successful");
        navigate("/portal", { replace: true });
      },
      onError: (error: any) => {
        const errorMessage =
          error.response?.data?.message || "An error occurred";
        toast.error(errorMessage);
      },
    });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 
      bg-gradient-to-br from-slate-50 via-white to-slate-100"
    >
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/5 to-purple-500/5 blur-3xl pointer-events-none" />

      <Card className="relative w-full max-w-md shadow-2xl border border-border/50 backdrop-blur-sm">
        {/* Logo + Brand */}
        <div className="flex items-center justify-center gap-3 mt-6">
          {/* Logo MaximSaigon */}
          <div className="size-10 rounded-xl overflow-hidden bg-white flex items-center justify-center">
            <img
              src="/logo/logotab2.jpg"
              alt="MaximSaigon"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Brand */}
          <span className="text-2xl font-bold tracking-wide text-black">
            MaximSaigon
          </span>
        </div>

        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">
            Welcome back
          </CardTitle>

          <CardDescription>
            Sign in to continue to your workspace
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleOnSubmit)}
              className="space-y-5"
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>

                    <FormControl>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        className="h-11 focus-visible:ring-2 focus-visible:ring-indigo-500"
                        {...field}
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>

                      <Link
                        to="/forgot-password"
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <FormControl>
                      <Input
                        type="password"
                        placeholder="********"
                        className="h-11 focus-visible:ring-2 focus-visible:ring-indigo-500"
                        {...field}
                      />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold 
                bg-indigo-600 hover:bg-indigo-700 transition-all"
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>

        {/* <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              to="/sign-up"
              className="text-primary font-medium hover:underline"
            >
              Sign up
            </Link>
          </p>
        </CardFooter> */}
      </Card>
    </div>
  );
};

export default SignIn;