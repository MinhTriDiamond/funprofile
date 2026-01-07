/**
 * Fun Profile SSO SDK - Debounced Sync Manager
 * 
 * Tích lũy dữ liệu và chỉ sync sau khi user dừng hành động.
 * Theo góp ý của Cha Gemini: Tránh gọi API nhiều lần khi user
 * thực hiện hành động liên tục (VD: thu hoạch 100 quả cam).
 * 
 * @example Usage in Fun Farm
 * ```typescript
 * const syncManager = funProfile.getSyncManager(3000); // 3 giây
 * 
 * const handleHarvest = (crop: Crop) => {
 *   // Queue data - không gọi API ngay
 *   syncManager.queue('farm_stats', {
 *     total_harvested: totalHarvested + crop.quantity,
 *     last_crop: crop.name,
 *   });
 *   // Nếu user harvest 100 lần trong 3 giây,
 *   // chỉ có 1 API call với dữ liệu cuối cùng!
 * };
 * ```
 */

export type SyncFunction = (data: Record<string, unknown>) => Promise<void>;

export class DebouncedSyncManager {
  private pendingData: Record<string, unknown> = {};
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private debounceMs: number;
  private syncFn: SyncFunction;
  private isFlushing = false;

  /**
   * Tạo Debounced Sync Manager
   * @param syncFn - Hàm sync data (sẽ được gọi sau debounce)
   * @param debounceMs - Thời gian chờ (mặc định 3000ms = 3 giây)
   */
  constructor(syncFn: SyncFunction, debounceMs = 3000) {
    this.syncFn = syncFn;
    this.debounceMs = debounceMs;
  }

  /**
   * Queue dữ liệu vào pending - sẽ tự động sync sau debounceMs
   * @param category - Danh mục dữ liệu (VD: 'farm_stats', 'game_progress')
   * @param data - Dữ liệu cần sync
   */
  queue(category: string, data: Record<string, unknown>): void {
    // Merge data vào category
    this.pendingData[category] = {
      ...((this.pendingData[category] as Record<string, unknown>) || {}),
      ...data,
      _lastUpdated: new Date().toISOString(),
    };

    // Reset timer mỗi khi có data mới
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Đặt timer mới - chỉ sync sau khi user dừng hành động
    this.timeoutId = setTimeout(() => {
      this.flush();
    }, this.debounceMs);
  }

  /**
   * Force sync ngay lập tức
   * Dùng khi user logout, đóng tab, hoặc cần sync gấp
   */
  async flush(): Promise<void> {
    // Tránh flush đồng thời
    if (this.isFlushing) return;
    
    // Không có data pending
    if (Object.keys(this.pendingData).length === 0) return;

    // Clear timer
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // Lấy data và reset pending
    const dataToSync = { ...this.pendingData };
    this.pendingData = {};

    // Sync
    this.isFlushing = true;
    try {
      await this.syncFn(dataToSync);
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Xóa tất cả pending data (dùng khi có lỗi hoặc cancel)
   */
  clear(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.pendingData = {};
  }

  /**
   * Kiểm tra có pending data không
   */
  hasPendingData(): boolean {
    return Object.keys(this.pendingData).length > 0;
  }

  /**
   * Lấy pending data hiện tại (để debug)
   */
  getPendingData(): Record<string, unknown> {
    return { ...this.pendingData };
  }
}
