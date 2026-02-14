import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, Trophy, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/i18n/LanguageContext';

interface RewardFormulaCardProps {
  defaultOpen?: boolean;
}

export const RewardFormulaCard = ({ defaultOpen = false }: RewardFormulaCardProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { t } = useLanguage();

  const REWARD_FORMULA = [
    { action: t('walletFormulaNewUser'), emoji: '🎁', rewardPerUnit: '50,000 CAMLY', dailyLimit: t('walletFormulaOnceOnly'), maxDaily: '50,000 CAMLY' },
    { action: t('walletFormulaPost'), emoji: '📝', rewardPerUnit: '10,000 CAMLY', dailyLimit: `10 ${t('walletFormulaPosts')}`, maxDaily: '100,000 CAMLY' },
    { action: t('walletFormulaReaction'), emoji: '❤️', rewardPerUnit: '1,000 CAMLY', dailyLimit: `50 ${t('walletFormulaReactions')}`, maxDaily: '50,000 CAMLY' },
    { action: t('walletFormulaComment'), emoji: '💬', rewardPerUnit: '2,000 CAMLY', dailyLimit: `50 ${t('walletFormulaComments')}`, maxDaily: '100,000 CAMLY' },
    { action: t('walletFormulaShare'), emoji: '🔄', rewardPerUnit: '10,000 CAMLY', dailyLimit: `5 ${t('walletFormulaShares')}`, maxDaily: '50,000 CAMLY' },
    { action: t('walletFormulaFriend'), emoji: '👥', rewardPerUnit: '10,000 CAMLY', dailyLimit: `10 ${t('walletFormulaFriends')}`, maxDaily: '100,000 CAMLY' },
    { action: t('walletFormulaLivestream'), emoji: '📺', rewardPerUnit: '20,000 CAMLY', dailyLimit: `5 ${t('walletFormulaSessions')}`, maxDaily: '100,000 CAMLY' },
  ];

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base text-gray-800 dark:text-gray-200">
                <Trophy className="w-5 h-5 text-yellow-500" />
                {t('walletRewardFormula')}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30">
                    <TableHead className="font-semibold text-amber-800 dark:text-amber-200">{t('walletAction')}</TableHead>
                    <TableHead className="font-semibold text-amber-800 dark:text-amber-200 text-right">{t('walletRewardPerTime')}</TableHead>
                    <TableHead className="font-semibold text-amber-800 dark:text-amber-200 text-right hidden sm:table-cell">{t('walletDailyLimit')}</TableHead>
                    <TableHead className="font-semibold text-amber-800 dark:text-amber-200 text-right hidden md:table-cell">{t('walletMaxDaily')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {REWARD_FORMULA.map((item, index) => (
                    <TableRow key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{item.emoji}</span>
                          <span className="text-gray-700 dark:text-gray-300 text-sm">{item.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-amber-600 dark:text-amber-400 font-medium text-sm">{item.rewardPerUnit}</TableCell>
                      <TableCell className="text-right text-gray-600 dark:text-gray-400 text-sm hidden sm:table-cell">{item.dailyLimit}</TableCell>
                      <TableCell className="text-right text-green-600 dark:text-green-400 font-medium text-sm hidden md:table-cell">{item.maxDaily}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-3 p-3 bg-gradient-to-r from-yellow-400/10 to-amber-400/10 rounded-lg border border-yellow-400/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  💰 {t('walletMaxDailyTotal')}:
                </span>
                <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">500,000 CAMLY</span>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>{t('walletFormulaDailyNote')}</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default RewardFormulaCard;
