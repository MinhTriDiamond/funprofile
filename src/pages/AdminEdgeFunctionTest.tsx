import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Mail, 
  KeyRound, 
  Wallet, 
  Sparkles, 
  Play, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  ArrowLeft,
  Copy
} from "lucide-react";
import { Link } from "react-router-dom";

interface TestResult {
  success: boolean;
  data?: unknown;
  error?: string;
  timestamp: string;
}

export default function AdminEdgeFunctionTest() {
  // OTP Request State
  const [otpEmail, setOtpEmail] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResult, setOtpResult] = useState<TestResult | null>(null);

  // OTP Verify State
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState<TestResult | null>(null);

  // Web3 Auth State
  const [walletAddress, setWalletAddress] = useState("");
  const [web3Loading, setWeb3Loading] = useState(false);
  const [web3Result, setWeb3Result] = useState<TestResult | null>(null);

  // Create Wallet State
  const [walletUserId, setWalletUserId] = useState("");
  const [createWalletLoading, setCreateWalletLoading] = useState(false);
  const [createWalletResult, setCreateWalletResult] = useState<TestResult | null>(null);

  // Mint Soul NFT State
  const [mintUserId, setMintUserId] = useState("");
  const [soulName, setSoulName] = useState("");
  const [mintLoading, setMintLoading] = useState(false);
  const [mintResult, setMintResult] = useState<TestResult | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Đã copy vào clipboard!");
  };

  // Test OTP Request
  const testOtpRequest = async () => {
    if (!otpEmail) {
      toast.error("Vui lòng nhập email");
      return;
    }

    setOtpLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sso-otp-request", {
        body: { identifier: otpEmail, type: "email" }
      });

      if (error) throw error;

      setOtpResult({
        success: true,
        data,
        timestamp: new Date().toLocaleTimeString()
      });

      // Auto-fill verify fields
      setVerifyEmail(otpEmail);
      if (data?.debug_otp) {
        setVerifyCode(data.debug_otp);
      }

      toast.success("OTP đã được gửi thành công!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setOtpResult({
        success: false,
        error: errorMessage,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.error("Lỗi: " + errorMessage);
    } finally {
      setOtpLoading(false);
    }
  };

  // Test OTP Verify
  const testOtpVerify = async () => {
    if (!verifyEmail || !verifyCode) {
      toast.error("Vui lòng nhập email và mã OTP");
      return;
    }

    setVerifyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("sso-otp-verify", {
        body: { identifier: verifyEmail, code: verifyCode }
      });

      if (error) throw error;

      setVerifyResult({
        success: true,
        data,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.success("Xác thực OTP thành công!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setVerifyResult({
        success: false,
        error: errorMessage,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.error("Lỗi: " + errorMessage);
    } finally {
      setVerifyLoading(false);
    }
  };

  // Test Web3 Auth
  const testWeb3Auth = async () => {
    if (!walletAddress) {
      toast.error("Vui lòng nhập địa chỉ ví");
      return;
    }

    setWeb3Loading(true);
    try {
      // Generate a mock signature for testing
      const mockSignature = "0x" + "a".repeat(130);
      const message = `Sign in to FUN.RICH at ${new Date().toISOString()}`;

      const { data, error } = await supabase.functions.invoke("sso-web3-auth", {
        body: { 
          wallet_address: walletAddress, 
          signature: mockSignature,
          message 
        }
      });

      if (error) throw error;

      setWeb3Result({
        success: true,
        data,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.success("Đăng nhập Web3 thành công!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setWeb3Result({
        success: false,
        error: errorMessage,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.error("Lỗi: " + errorMessage);
    } finally {
      setWeb3Loading(false);
    }
  };

  // Test Create Custodial Wallet
  const testCreateWallet = async () => {
    if (!walletUserId) {
      toast.error("Vui lòng nhập User ID");
      return;
    }

    setCreateWalletLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-custodial-wallet", {
        body: { user_id: walletUserId, chain_id: 56 }
      });

      if (error) throw error;

      setCreateWalletResult({
        success: true,
        data,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.success("Tạo ví thành công!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setCreateWalletResult({
        success: false,
        error: errorMessage,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.error("Lỗi: " + errorMessage);
    } finally {
      setCreateWalletLoading(false);
    }
  };

  // Test Mint Soul NFT
  const testMintSoulNft = async () => {
    if (!mintUserId) {
      toast.error("Vui lòng nhập User ID");
      return;
    }

    setMintLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("mint-soul-nft", {
        body: { user_id: mintUserId, soul_name: soulName || undefined }
      });

      if (error) throw error;

      setMintResult({
        success: true,
        data,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.success("Mint Soul NFT thành công!");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMintResult({
        success: false,
        error: errorMessage,
        timestamp: new Date().toLocaleTimeString()
      });
      toast.error("Lỗi: " + errorMessage);
    } finally {
      setMintLoading(false);
    }
  };

  const ResultDisplay = ({ result }: { result: TestResult | null }) => {
    if (!result) return null;

    return (
      <div className={`mt-4 p-4 rounded-lg border ${result.success ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
        <div className="flex items-center gap-2 mb-2">
          {result.success ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" />
          )}
          <span className="font-medium">{result.success ? 'Thành công' : 'Thất bại'}</span>
          <span className="text-xs text-muted-foreground ml-auto">{result.timestamp}</span>
        </div>
        <div className="relative">
          <pre className="text-xs bg-background/50 p-3 rounded overflow-x-auto max-h-60">
            {JSON.stringify(result.success ? result.data : result.error, null, 2)}
          </pre>
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-1 right-1"
            onClick={() => copyToClipboard(JSON.stringify(result.success ? result.data : result.error, null, 2))}
          >
            <Copy className="w-3 h-3" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Edge Function Test Dashboard</h1>
            <p className="text-muted-foreground">Kiểm tra các hàm backend Phase 2</p>
          </div>
        </div>

        <Tabs defaultValue="otp" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="otp" className="flex flex-col gap-1 py-3">
              <Mail className="w-4 h-4" />
              <span className="text-xs">OTP Request</span>
            </TabsTrigger>
            <TabsTrigger value="verify" className="flex flex-col gap-1 py-3">
              <KeyRound className="w-4 h-4" />
              <span className="text-xs">OTP Verify</span>
            </TabsTrigger>
            <TabsTrigger value="web3" className="flex flex-col gap-1 py-3">
              <Wallet className="w-4 h-4" />
              <span className="text-xs">Web3 Auth</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex flex-col gap-1 py-3">
              <Wallet className="w-4 h-4" />
              <span className="text-xs">Create Wallet</span>
            </TabsTrigger>
            <TabsTrigger value="mint" className="flex flex-col gap-1 py-3">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs">Mint NFT</span>
            </TabsTrigger>
          </TabsList>

          {/* OTP Request Tab */}
          <TabsContent value="otp">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>sso-otp-request</CardTitle>
                  <Badge variant="secondary">Public</Badge>
                </div>
                <CardDescription>
                  Gửi mã OTP đến email hoặc số điện thoại của user
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input
                    type="email"
                    placeholder="test@example.com"
                    value={otpEmail}
                    onChange={(e) => setOtpEmail(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={testOtpRequest} 
                  disabled={otpLoading}
                  className="w-full"
                >
                  {otpLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Gửi OTP
                </Button>
                <ResultDisplay result={otpResult} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* OTP Verify Tab */}
          <TabsContent value="verify">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>sso-otp-verify</CardTitle>
                  <Badge variant="secondary">Public</Badge>
                </div>
                <CardDescription>
                  Xác thực mã OTP và tạo session cho user
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input
                    type="email"
                    placeholder="test@example.com"
                    value={verifyEmail}
                    onChange={(e) => setVerifyEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Mã OTP</label>
                  <Input
                    type="text"
                    placeholder="123456"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={testOtpVerify} 
                  disabled={verifyLoading}
                  className="w-full"
                >
                  {verifyLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Xác thực OTP
                </Button>
                <ResultDisplay result={verifyResult} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Web3 Auth Tab */}
          <TabsContent value="web3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>sso-web3-auth</CardTitle>
                  <Badge variant="secondary">Public</Badge>
                </div>
                <CardDescription>
                  Đăng nhập bằng ví crypto (MetaMask, WalletConnect...)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Địa chỉ ví</label>
                  <Input
                    type="text"
                    placeholder="0x1234...abcd"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    *Test mode: Signature được mock tự động
                  </p>
                </div>
                <Button 
                  onClick={testWeb3Auth} 
                  disabled={web3Loading}
                  className="w-full"
                >
                  {web3Loading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Đăng nhập Web3
                </Button>
                <ResultDisplay result={web3Result} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Create Wallet Tab */}
          <TabsContent value="wallet">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>create-custodial-wallet</CardTitle>
                  <Badge variant="outline">Requires Auth</Badge>
                </div>
                <CardDescription>
                  Tự động tạo ví custodial cho user đăng ký qua email
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">User ID (UUID)</label>
                  <Input
                    type="text"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={walletUserId}
                    onChange={(e) => setWalletUserId(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={testCreateWallet} 
                  disabled={createWalletLoading}
                  className="w-full"
                >
                  {createWalletLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Tạo Ví Custodial
                </Button>
                <ResultDisplay result={createWalletResult} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Mint Soul NFT Tab */}
          <TabsContent value="mint">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>mint-soul-nft</CardTitle>
                  <Badge variant="outline">Requires Auth</Badge>
                </div>
                <CardDescription>
                  Đúc Soul NFT định danh gắn với FUN-ID của user
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">User ID (UUID)</label>
                  <Input
                    type="text"
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={mintUserId}
                    onChange={(e) => setMintUserId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Soul Name (tuỳ chọn)</label>
                  <Input
                    type="text"
                    placeholder="Để trống sẽ dùng FUN-ID"
                    value={soulName}
                    onChange={(e) => setSoulName(e.target.value)}
                  />
                </div>
                <Button 
                  onClick={testMintSoulNft} 
                  disabled={mintLoading}
                  className="w-full"
                >
                  {mintLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Mint Soul NFT
                </Button>
                <ResultDisplay result={mintResult} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* API Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">API Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>POST /sso-otp-request</span>
                <Badge variant="secondary">Public</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>POST /sso-otp-verify</span>
                <Badge variant="secondary">Public</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>POST /sso-web3-auth</span>
                <Badge variant="secondary">Public</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>POST /create-custodial-wallet</span>
                <Badge variant="outline">Auth</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span>POST /mint-soul-nft</span>
                <Badge variant="outline">Auth</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
