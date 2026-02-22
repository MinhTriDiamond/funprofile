import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { UserDirectoryFilters as Filters } from '@/hooks/useUserDirectory';

interface Props {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export const UserDirectoryFilters = ({ filters, onChange }: Props) => {
  const update = (key: keyof Filters, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={filters.scoreRange} onValueChange={(v) => update('scoreRange', v)}>
        <SelectTrigger className="w-[140px] h-9 text-xs bg-background">
          <SelectValue placeholder="Điểm" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="all">Tất cả điểm</SelectItem>
          <SelectItem value="high">Cao (≥1000)</SelectItem>
          <SelectItem value="medium">TB (100-999)</SelectItem>
          <SelectItem value="low">Thấp (&lt;100)</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.funMoney} onValueChange={(v) => update('funMoney', v)}>
        <SelectTrigger className="w-[140px] h-9 text-xs bg-background">
          <SelectValue placeholder="FUN Money" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="all">Tất cả FUN</SelectItem>
          <SelectItem value="has">Có FUN</SelectItem>
          <SelectItem value="none">Chưa có</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.withdrawn} onValueChange={(v) => update('withdrawn', v)}>
        <SelectTrigger className="w-[140px] h-9 text-xs bg-background">
          <SelectValue placeholder="Đã rút" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="all">Tất cả</SelectItem>
          <SelectItem value="yes">Đã rút</SelectItem>
          <SelectItem value="no">Chưa rút</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => update('status', v)}>
        <SelectTrigger className="w-[140px] h-9 text-xs bg-background">
          <SelectValue placeholder="Trạng thái" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="all">Tất cả TT</SelectItem>
          <SelectItem value="active">Hoạt động</SelectItem>
          <SelectItem value="banned">Bị cấm</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.wallet} onValueChange={(v) => update('wallet', v)}>
        <SelectTrigger className="w-[140px] h-9 text-xs bg-background">
          <SelectValue placeholder="Ví" />
        </SelectTrigger>
        <SelectContent className="bg-background z-50">
          <SelectItem value="all">Tất cả ví</SelectItem>
          <SelectItem value="has">Có ví</SelectItem>
          <SelectItem value="none">Chưa có ví</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
