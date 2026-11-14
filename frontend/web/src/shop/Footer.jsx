import { Link } from 'react-router-dom';

function Footer({ settings }) {
  return (
    <>
      <style>{`
        .site-footer {
          margin-top: 40px;
          background: #fff;
          color: #555;
          border-top: 1px solid #e5e5e5;
        }

        .footer-container {
          width: min(1200px, calc(100% - 32px));
          margin: 0 auto;
          padding: 38px 0 0;
        }

        .footer-section {
          padding-bottom: 28px;
        }

        .footer-section h2 {
          margin: 0 0 12px;
          color: #333;
          font-size: 14px;
          line-height: 1.4;
          font-weight: 600;
          text-transform: uppercase;
        }

        .footer-section p {
          margin: 0 0 10px;
          color: #666;
          font-size: 12px;
          line-height: 1.7;
        }

        .footer-section a {
          color: #666;
          text-decoration: none;
          transition: color .15s ease;
        }

        .footer-section a:hover {
          color: #ee4d2d;
        }

        .footer-link-cloud {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 5px;
        }

        .footer-link-cloud span {
          color: #ccc;
          user-select: none;
        }

        .footer-help-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }

        .footer-help-item {
          font-size: 12px;
        }

        .footer-bottom {
          min-height: 70px;
          margin-top: 5px;
          padding: 18px 0;

          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;

          border-top: 1px solid #eee;

          color: #888;
          font-size: 12px;
        }

        .footer-bottom-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .footer-bottom a {
          color: #666;
          text-decoration: none;
        }

        .footer-bottom a:hover {
          color: #ee4d2d;
        }

        @media (max-width: 992px) {
          .footer-help-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .footer-container {
            width: min(100% - 24px, 1200px);
            padding-top: 28px;
          }

          .footer-section {
            padding-bottom: 22px;
          }

          .footer-section h2 {
            font-size: 13px;
          }

          .footer-section p,
          .footer-section a,
          .footer-help-item {
            font-size: 11px;
          }

          .footer-help-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
          }

          .footer-bottom {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }

        @media (max-width: 480px) {
          .footer-help-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <footer className="site-footer">
        <div className="footer-container">
          {settings && <section className="footer-section"><h2>{settings.storeName}</h2>{settings.storeAddress && <p>{settings.storeAddress}</p>}{settings.supportEmail && <p><a href={`mailto:${settings.supportEmail}`}>{settings.supportEmail}</a></p>}{settings.supportPhone && <p><a href={`tel:${settings.supportPhone.replace(/[^+0-9]/g, '')}`}>{settings.supportPhone}</a></p>}</section>}

          {/* GIỚI THIỆU */}
          <section className="footer-section">
            <h2>
              RISKMIND AI - MUA SẮM THÔNG MINH, AN TÂM HƠN
            </h2>

            <p>
              RiskMind AI là nền tảng thương mại điện tử kết hợp
              công nghệ trí tuệ nhân tạo nhằm hỗ trợ người mua và
              người bán có trải nghiệm mua sắm an toàn, minh bạch
              và hiệu quả hơn.
            </p>

            <p>
              Người mua có thể tìm kiếm sản phẩm, lựa chọn cửa hàng,
              sử dụng phiếu ưu đãi và theo dõi đơn hàng. Người bán được
              hỗ trợ phân tích rủi ro người mua và nhận các khuyến nghị
              từ hệ thống trí tuệ nhân tạo.
            </p>
          </section>

          {/* MUA SẮM */}
          <section className="footer-section">
            <h2>
              MUA SẮM TRỰC TUYẾN ĐƠN GIẢN, NHANH CHÓNG VÀ AN TOÀN
            </h2>

            <p>
              RiskMind cung cấp nhiều ngành hàng từ điện thoại,
              laptop, điện tử, phụ kiện, gia dụng, nhà bếp,
              thời trang và nhiều sản phẩm tiêu dùng khác.
            </p>

            <p>
              Người dùng có thể xem sản phẩm, lựa chọn biến thể,
              kiểm tra tồn kho, nhận phiếu ưu đãi theo ngành hàng và
              thực hiện mua sắm ngay trên nền tảng.
            </p>
          </section>

          {/* NGƯỜI BÁN */}
          <section className="footer-section">
            <h2>
              NỀN TẢNG HỖ TRỢ NGƯỜI BÁN
            </h2>

            <p>
              Người bán có thể quản lý sản phẩm, cửa hàng,
              đơn hàng, chương trình khuyến mãi và theo dõi
              hoạt động kinh doanh trên cùng một nền tảng.
            </p>

            <p>
              RiskMind AI hỗ trợ phân tích rủi ro người mua
              nhằm cung cấp thêm thông tin tham khảo trước
              khi người bán xử lý đơn hàng.
            </p>
          </section>

          {/* KHUYẾN MÃI */}
          <section className="footer-section">
            <h2>
              PHIẾU ƯU ĐÃI, MIỄN PHÍ VẬN CHUYỂN VÀ KHUYẾN MÃI
            </h2>

            <p>
              RiskMind hỗ trợ phiếu ưu đãi theo từng ngành hàng,
              mã giảm giá theo điều kiện đơn hàng, miễn phí vận chuyển
              và các chương trình Giờ vàng giảm giá.
            </p>

            <p>
              Người mua có thể theo dõi các ưu đãi đang hoạt động
              và sử dụng phiếu ưu đãi phù hợp với điều kiện đơn hàng.
            </p>
          </section>

          {/* THƯƠNG HIỆU */}
          <section className="footer-section">
            <h2>
              THƯƠNG HIỆU NỔI BẬT
            </h2>

            <div className="footer-link-cloud">
              <Link to="/#products">
                Samsung
              </Link>

              <span>|</span>

              <Link to="/#products">
                Apple
              </Link>

              <span>|</span>

              <Link to="/#products">
                Logitech
              </Link>

              <span>|</span>

              <Link to="/#products">
                HP
              </Link>

              <span>|</span>

              <Link to="/#products">
                ViewSonic
              </Link>

              <span>|</span>

              <Link to="/#products">
                Sony
              </Link>

              <span>|</span>

              <Link to="/#products">
                LG
              </Link>

              <span>|</span>

              <Link to="/#products">
                Xiaomi
              </Link>

              <span>|</span>

              <Link to="/#products">
                Philips
              </Link>

              <span>|</span>

              <Link to="/#products">
                Panasonic
              </Link>
            </div>
          </section>

          {/* NGÀNH HÀNG */}
          <section className="footer-section">
            <h2>
              NGÀNH HÀNG
            </h2>

            <div className="footer-link-cloud">
              <Link to="/#products">
                Điện thoại
              </Link>

              <span>|</span>

              <Link to="/#products">
                Laptop
              </Link>

              <span>|</span>

              <Link to="/#products">
                Điện tử
              </Link>

              <span>|</span>

              <Link to="/#products">
                Phụ kiện
              </Link>

              <span>|</span>

              <Link to="/#products">
                Gia dụng
              </Link>

              <span>|</span>

              <Link to="/#products">
                Nhà bếp
              </Link>

              <span>|</span>

              <Link to="/#products">
                Thời trang
              </Link>

              <span>|</span>

              <Link to="/#products">
                Vệ sinh nhà cửa
              </Link>
            </div>
          </section>

          {/* TỪ KHÓA */}
          <section className="footer-section">
            <h2>
              TỪ KHÓA XU HƯỚNG
            </h2>

            <div className="footer-link-cloud">
              <Link to="/#products">
                iPhone 17 Pro Max
              </Link>

              <span>|</span>

              <Link to="/#products">
                Samsung Galaxy S26
              </Link>

              <span>|</span>

              <Link to="/#products">
                Laptop HP
              </Link>

              <span>|</span>

              <Link to="/#products">
                Logitech
              </Link>

              <span>|</span>

              <Link to="/#products">
                ViewSonic
              </Link>

              <span>|</span>

              <Link to="/#products">
                phiếu ưu đãi
              </Link>

              <span>|</span>

              <Link to="/#products">
                miễn phí vận chuyển
              </Link>

              <span>|</span>

              <Link to="/#products">
                giờ vàng giảm giá
              </Link>
            </div>
          </section>

          {/* HỖ TRỢ */}
          <section className="footer-section">
            <h2>
              HỖ TRỢ KHÁCH HÀNG
            </h2>

            <div className="footer-help-grid">
              <div className="footer-help-item">
                <Link to="/#help">
                  Trung tâm hỗ trợ
                </Link>
              </div>

              <div className="footer-help-item">
                <Link to="/#contact">
                  Liên hệ
                </Link>
              </div>

              <div className="footer-help-item">
                <Link to="/#privacy">
                  Chính sách bảo mật
                </Link>
              </div>

              <div className="footer-help-item">
                <Link to="/#terms">
                  Điều khoản sử dụng
                </Link>
              </div>
            </div>
          </section>

          {/* BOTTOM */}
          <div className="footer-bottom">
            <span>
              © 2026 RiskMind AI. Bảo lưu mọi quyền.
            </span>

            <div className="footer-bottom-right">
              <Link to="/#privacy">
                Bảo mật
              </Link>

              <span>|</span>

              <Link to="/#terms">
                Điều khoản
              </Link>
            </div>
          </div>

        </div>
      </footer>
    </>
  );
}

export default Footer;
