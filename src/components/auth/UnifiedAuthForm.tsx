import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/i18n/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EmailOtpLogin } from './EmailOtpLogin';
import { WalletLogin } from './WalletLogin';
import { SocialLogin } from './SocialLogin';
import { Mail, Wallet, Users, Loader2, Sparkles } from 'lucide-react';

export const UnifiedAuthForm = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('email');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupStep, setSetupStep] = useState<'wallet' | 'nft' | 'complete' | null>(null);

  const handleNewUserSetup = async (userId: string) => {
    setIsSettingUp(true);

    try {
      // Step 1: Create custodial wallet
      setSetupStep('wallet');
      const { data: walletData, error: walletError } = await supabase.functions.invoke('create-custodial-wallet', {
        body: { user_id: userId },
      });

      if (walletError) {
        console.error('Wallet creation error:', walletError);
        // Non-blocking - continue even if wallet creation fails
      } else {
        console.log('Custodial wallet created:', walletData);
      }

      // Step 2: Mint Soul NFT
      setSetupStep('nft');
      const { data: nftData, error: nftError } = await supabase.functions.invoke('mint-soul-nft', {
        body: { user_id: userId },
      });

      if (nftError) {
        console.error('Soul NFT mint error:', nftError);
        // Non-blocking - continue even if NFT minting fails
      } else {
        console.log('Soul NFT minted:', nftData);
      }

      setSetupStep('complete');
      toast.success(t('accountSetupComplete'));
      
      // Small delay to show completion state
      await new Promise(resolve => setTimeout(resolve, 1000));
      navigate('/');
    } catch (error) {
      console.error('Setup error:', error);
      // Still navigate even if setup fails
      navigate('/');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleAuthSuccess = async (userId: string, isNewUser: boolean) => {
    if (isNewUser) {
      await handleNewUserSetup(userId);
    } else {
      toast.success(t('welcomeBack'));
      navigate('/');
    }
  };

  // Show setup progress overlay
  if (isSettingUp) {
    return (
      <div className="w-full max-w-md relative">
        <div className="relative p-2 rounded-3xl"
             style={{
               background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 20%, #fcd34d 40%, #d97706 60%, #f59e0b 80%, #fbbf24 100%)',
               boxShadow: '0 0 60px rgba(251, 191, 36, 0.6), 0 0 100px rgba(234, 179, 8, 0.4)',
             }}>
          <Card className="relative border-0 overflow-hidden rounded-2xl bg-white">
            <CardContent className="p-8">
              <div className="text-center space-y-6 py-8">
                <div className="relative inline-flex">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center animate-pulse">
                    <Sparkles className="text-white" size={40} />
                  </div>
                  <div className="absolute inset-0 rounded-full animate-ping opacity-30 bg-emerald-400" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-slate-800">
                    {t('welcomeNewUser')}
                  </h3>
                  
                  <div className="space-y-3 mt-6">
                    <SetupStepIndicator
                      step="wallet"
                      currentStep={setupStep}
                      label={t('creatingWallet')}
                    />
                    <SetupStepIndicator
                      step="nft"
                      currentStep={setupStep}
                      label={t('mintingSoulNft')}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md relative">
      {/* Outer Gold Metallic Frame - "Áo choàng Ánh sáng" */}
      <div className="relative p-2 rounded-3xl"
           style={{
             background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 20%, #fcd34d 40%, #d97706 60%, #f59e0b 80%, #fbbf24 100%)',
             boxShadow: '0 0 60px rgba(251, 191, 36, 0.6), 0 0 100px rgba(234, 179, 8, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.5), inset 0 -2px 4px rgba(0, 0, 0, 0.3)'
           }}>
        
        {/* Decorative Corner Glow Effects */}
        <div className="absolute top-2 left-2 w-8 h-8 rounded-full" 
             style={{ background: 'radial-gradient(circle, #fcd34d 0%, transparent 70%)', opacity: 0.7 }} />
        <div className="absolute top-2 right-2 w-8 h-8 rounded-full" 
             style={{ background: 'radial-gradient(circle, #fcd34d 0%, transparent 70%)', opacity: 0.7 }} />
        <div className="absolute bottom-2 left-2 w-8 h-8 rounded-full" 
             style={{ background: 'radial-gradient(circle, #fcd34d 0%, transparent 70%)', opacity: 0.7 }} />
        <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full" 
             style={{ background: 'radial-gradient(circle, #fcd34d 0%, transparent 70%)', opacity: 0.7 }} />

        {/* Animated Light Rays */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-full opacity-20"
               style={{
                 background: 'linear-gradient(180deg, rgba(255,255,255,0.8) 0%, transparent 50%)',
                 animation: 'lightRay 3s ease-in-out infinite',
               }} />
        </div>

        {/* Inner Pearl White Background */}
        <Card className="relative border-0 overflow-hidden rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 25%, #ffffff 50%, #f1f5f9 75%, #ffffff 100%)',
                boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 0 40px rgba(251, 191, 36, 0.05)'
              }}>
          
          {/* Circuit Board Pattern */}
          <div className="absolute inset-0 opacity-[0.02]" 
               style={{
                 backgroundImage: `
                   linear-gradient(90deg, #10b981 1px, transparent 1px),
                   linear-gradient(0deg, #10b981 1px, transparent 1px),
                   radial-gradient(circle at 20% 30%, #10b981 2px, transparent 2px),
                   radial-gradient(circle at 80% 70%, #10b981 2px, transparent 2px)
                 `,
                 backgroundSize: '30px 30px, 30px 30px, 60px 60px, 60px 60px',
                 backgroundPosition: '0 0, 0 0, 0 0, 30px 30px'
               }} />
          
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">
              {t('lightCloakWelcome')}
            </CardTitle>
            <CardDescription className="text-center text-slate-600">
              {t('lightCloakDescription')}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative z-10 pt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100/80 p-1 rounded-xl">
                <TabsTrigger 
                  value="email" 
                  className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-emerald-600 transition-all"
                >
                  <Mail size={16} />
                  <span className="hidden sm:inline">{t('authMethodEmail')}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="wallet"
                  className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-amber-600 transition-all"
                >
                  <Wallet size={16} />
                  <span className="hidden sm:inline">{t('authMethodWallet')}</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="social"
                  className="flex items-center gap-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-blue-600 transition-all"
                >
                  <Users size={16} />
                  <span className="hidden sm:inline">{t('authMethodSocial')}</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="email" className="mt-0">
                <EmailOtpLogin onSuccess={handleAuthSuccess} />
              </TabsContent>

              <TabsContent value="wallet" className="mt-0">
                <WalletLogin onSuccess={handleAuthSuccess} />
              </TabsContent>

              <TabsContent value="social" className="mt-0">
                <SocialLogin />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes lightRay {
          0%, 100% { opacity: 0.1; transform: translateX(-50%) rotate(-5deg); }
          50% { opacity: 0.3; transform: translateX(-50%) rotate(5deg); }
        }
      `}</style>
    </div>
  );
};

// Helper component for setup progress
const SetupStepIndicator = ({ 
  step, 
  currentStep, 
  label 
}: { 
  step: 'wallet' | 'nft'; 
  currentStep: 'wallet' | 'nft' | 'complete' | null; 
  label: string;
}) => {
  const stepOrder = ['wallet', 'nft', 'complete'];
  const currentIndex = currentStep ? stepOrder.indexOf(currentStep) : -1;
  const stepIndex = stepOrder.indexOf(step);
  
  const isActive = currentStep === step;
  const isComplete = currentIndex > stepIndex;
  const isPending = currentIndex < stepIndex;

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
      isActive ? 'bg-emerald-50 border border-emerald-200' : 
      isComplete ? 'bg-emerald-50/50' : 'bg-slate-50'
    }`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
        isComplete ? 'bg-emerald-500 text-white' :
        isActive ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'
      }`}>
        {isComplete ? '✓' : isActive ? <Loader2 className="animate-spin" size={16} /> : '○'}
      </div>
      <span className={`text-sm ${
        isActive ? 'text-emerald-700 font-medium' : 
        isComplete ? 'text-emerald-600' : 'text-slate-400'
      }`}>
        {label}
      </span>
    </div>
  );
};
