import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  // Password validation
  const validatePassword = (pwd: string) => {
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      number: /[0-9]/.test(pwd),
    };
    return checks;
  };

  const checks = validatePassword(password);
  const isPasswordValid = checks.length && checks.uppercase && checks.number;
  const doPasswordsMatch = password === confirmPassword && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Link không hợp lệ. Vui lòng kiểm tra lại email.");
      return;
    }

    if (!isPasswordValid) {
      setError("Mật khẩu chưa đủ mạnh.");
      return;
    }

    if (!doPasswordsMatch) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("sso-set-password", {
        body: {
          token,
          new_password: password,
        },
      });

      if (fnError) {
        throw new Error(fnError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setSuccess(true);
      setEmail(data?.email || null);

      // Update has_password flag if we have user info
      if (data?.user_id) {
        // The edge function handles this server-side, but update profile too
        const { createClient } = await import('@supabase/supabase-js');
      }

      // Redirect to auth page after 3 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (err) {
      console.error("Set password error:", err);
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="w-16 h-16 mx-auto text-destructive mb-4" />
            <CardTitle>Link Không Hợp Lệ</CardTitle>
            <CardDescription>
              Link đặt mật khẩu không hợp lệ hoặc đã hết hạn.
              Vui lòng kiểm tra lại email của bạn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Về trang đăng nhập
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-primary mb-4" />
            <CardTitle>Tạo Mật Khẩu Thành Công!</CardTitle>
            <CardDescription>
              {email && `Tài khoản ${email} đã sẵn sàng.`}
              <br />
              Đang chuyển hướng đến trang đăng nhập...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/auth")} className="w-full">
              Đăng nhập ngay
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center">
            <span className="text-2xl">🔐</span>
          </div>
          <CardTitle>Tạo Mật Khẩu</CardTitle>
          <CardDescription>
            Tạo mật khẩu để hoàn tất đăng ký Fun-ID của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu mới</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Password requirements */}
              <div className="space-y-1 text-sm">
                <div className={`flex items-center gap-2 ${checks.length ? "text-primary" : "text-muted-foreground"}`}>
                  {checks.length ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Ít nhất 8 ký tự
                </div>
                <div className={`flex items-center gap-2 ${checks.uppercase ? "text-primary" : "text-muted-foreground"}`}>
                  {checks.uppercase ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Ít nhất 1 chữ hoa (A-Z)
                </div>
                <div className={`flex items-center gap-2 ${checks.number ? "text-primary" : "text-muted-foreground"}`}>
                  {checks.number ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  Ít nhất 1 số (0-9)
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
              />
              {confirmPassword && !doPasswordsMatch && (
                <p className="text-sm text-destructive">Mật khẩu không khớp</p>
              )}
              {doPasswordsMatch && (
                <p className="text-sm text-primary flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" /> Mật khẩu khớp
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !isPasswordValid || !doPasswordsMatch}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Tạo mật khẩu"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
