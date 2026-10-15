# Germany – Vietnam Shipper Game

Web game nhập vai shipper, chạy hoàn toàn trên trình duyệt: không database, không gọi API.
Tiến độ của mỗi người lưu trong `localStorage` trên chính máy của họ.

## Luồng chơi

1. **Màn chính** (theme poster vẽ tay): tên game, rồi nút **START**.
2. Bấm START thì hiện **chuông rung rung**. Bấm chuông, thông báo *"Có 10 đơn hàng đang cần xử lý"* rơi xuống.
3. Bấm thông báo để mở **danh sách đơn**. Mỗi người trong đoàn có một đơn, trạng thái
   *"Đang điều phối shipper [tên]"*. Có thể tìm đơn có tên mình hoặc bấm **Bốc thăm ngẫu nhiên**.
4. Mở đơn: giao từ đâu tới đâu, nút **Nhận đơn**. Bấm xong thì map chạy từ điểm đầu đến điểm cuối,
   trạng thái *"Đang giao hàng"*, kèm nút **Xác nhận đã giao hàng**.
5. Bấm xác nhận sẽ hiện popup **Congratulations!**

## Chạy local

```bash
npm install
npm run dev      # http://localhost:3100
npm run build    # typecheck + build ra dist/
```

## Sửa nội dung

Toàn bộ nội dung nằm trong `src/config/game.ts`:

- `GAME.title`: tên game (hiện là tên tạm). `GAME.banner`: chữ trên băng rôn xanh. `GAME.subtitle`: dòng chữ vàng.
- `PLAYERS`: danh sách tên người trong đoàn. **Số đơn = số tên**: thêm hoặc bớt tên thì số đơn tự đổi theo.
- `ORDER_POOL`: món hàng, điểm đầu/điểm cuối, quãng đường, phí ship. Danh sách này chia lần lượt cho từng người,
  nên ngắn hơn số người cũng được.

## Deploy lên GitHub Pages

Repo: https://github.com/LeDoanTrung/germany_vietnam_game

1. Push code lên nhánh `main`. Workflow `.github/workflows/deploy.yml` tự build và đẩy lên nhánh `gh-pages`.
2. Lần đầu: vào **Settings → Pages → Source: Deploy from a branch → `gh-pages` / root**.
3. Trang chạy tại https://ledoantrung.github.io/germany_vietnam_game/

## Ghi chú kỹ thuật

- Vue 3 + Vite + TypeScript, animation bằng GSAP.
- Màn chính dùng theme poster vẽ tay (minh hoạ SVG tự vẽ, filter vân sáp màu); các màn trong "app shipper" dùng giao diện hologram.
- Âm thanh tổng hợp bằng Web Audio API nên không có file âm thanh nào đi kèm.
- Font hỗ trợ đầy đủ tiếng Việt: Baloo 2, Mali, Be Vietnam Pro, Space Mono (đóng gói qua `@fontsource`).
- Tôn trọng chế độ *giảm chuyển động* (`prefers-reduced-motion`) của hệ điều hành.
