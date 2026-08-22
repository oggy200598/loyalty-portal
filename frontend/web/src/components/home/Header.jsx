function Header() {
  return (
    <>
      <style>{`
        .rm-header {
          position: sticky;
          top: 0;
          z-index: 1000;
          color: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .rm-topbar,
        .rm-mainbar {
          background: #ee4d2d;
        }

        .rm-header-container {
          width: min(1200px, calc(100% - 32px));
          margin: 0 auto;
        }

        .rm-topbar {
          font-size: 13px;
        }

        .rm-topbar .rm-header-container {
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .rm-top-left,
        .rm-top-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .rm-topbar a,
        .rm-brand,
        .rm-suggestions a,
        .rm-cart {
          color: #fff;
          text-decoration: none;
        }

        .rm-divider {
          opacity: 0.5;
        }

        .rm-mainbar .rm-header-container {
          min-height: 112px;
          display: grid;
          grid-template-columns: 210px minmax(0, 1fr) 70px;
          align-items: center;
          gap: 28px;
        }

        .rm-brand {
          display: inline-flex;
          align-items: center;
          gap: 12px;
        }

        .rm-logo {
          width: 54px;
          height: 54px;
          display: grid;
          place-items: center;
          border: 2px solid #fff;
          border-radius: 14px;
          background: rgba(255,255,255,.12);
          font-size: 25px;
          font-weight: 800;
        }

        .rm-brand-text {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .rm-brand-text strong {
          font-size: 29px;
        }

        .rm-brand-text span {
          font-size: 20px;
          font-weight: 700;
        }

        .rm-search-wrapper {
          min-width: 0;
        }

        .rm-search {
          height: 48px;
          display: flex;
          overflow: hidden;
          background: #fff;
          border-radius: 4px;
        }

        .rm-search input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          padding: 0 16px;
          font-size: 14px;
        }

        .rm-search button {
          width: 62px;
          border: 5px solid #fff;
          background: #ee4d2d;
          color: #fff;
          font-size: 19px;
          cursor: pointer;
        }

        .rm-suggestions {
          display: flex;
          gap: 20px;
          margin-top: 7px;
          overflow: hidden;
          white-space: nowrap;
        }

        .rm-suggestions a {
          font-size: 12px;
        }

        .rm-cart {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .rm-cart i {
          font-size: 32px;
        }

        .rm-cart-badge {
          position: absolute;
          top: -6px;
          right: 2px;
          min-width: 19px;
          height: 19px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 5px;
          border: 2px solid #ee4d2d;
          border-radius: 999px;
          background: #fff;
          color: #ee4d2d;
          font-size: 11px;
          font-weight: 700;
        }

        @media (max-width: 900px) {
          .rm-mainbar .rm-header-container {
            grid-template-columns: 160px minmax(0, 1fr) 50px;
            gap: 16px;
          }

          .rm-top-left {
            display: none;
          }

          .rm-topbar .rm-header-container {
            justify-content: flex-end;
          }
        }

        @media (max-width: 600px) {
          .rm-mainbar .rm-header-container {
            grid-template-columns: auto 1fr auto;
            gap: 10px;
          }

          .rm-brand-text,
          .rm-suggestions {
            display: none;
          }
        }
      `}</style>

      <header className="rm-header">
        {/* TOP BAR */}
        <div className="rm-topbar">
          <div className="rm-header-container">
            <div className="rm-top-left">
              <a href="#seller">Kênh Người Bán</a>
              <span className="rm-divider">|</span>
              <a href="#be-seller">Trở thành Người bán</a>
              <span className="rm-divider">|</span>
              <a href="#download">Tải ứng dụng</a>
              <span className="rm-divider">|</span>
              <span>Kết nối</span>

              <a href="#">
                <i className="bi bi-facebook" />
              </a>

              <a href="#">
                <i className="bi bi-instagram" />
              </a>
            </div>

            <div className="rm-top-right">
              <a href="#notifications">
                <i className="bi bi-bell" />
                Thông báo
              </a>

              <a href="#support">
                <i className="bi bi-question-circle me-1" />
                Hỗ trợ
              </a>

              <a href="#language">
                <i className="bi bi-globe2 me-1" />
                Tiếng Việt
                <i className="bi bi-chevron-down ms-1" />
              </a>

              <a href="#register">Đăng ký</a>
              <span className="rm-divider">|</span>
              <a href="#login">Đăng nhập</a>
            </div>
          </div>
        </div>

        {/* MAIN BAR */}
        <div className="rm-mainbar">
          <div className="rm-header-container">
            <a href="#home" className="rm-brand">
              <div className="rm-logo">R</div>

              <div className="rm-brand-text">
                <strong>RiskMind</strong>
                <span>AI</span>
              </div>
            </a>

            <div className="rm-search-wrapper">
              <div className="rm-search">
                <input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm, cửa hàng..."
                />

                <button type="button">
                  <i className="bi bi-search" />
                </button>
              </div>

              <div className="rm-suggestions">
                <a href="#products">Điện thoại</a>
                <a href="#products">Thời trang</a>
                <a href="#products">Gia dụng</a>
                <a href="#products">Điện tử</a>
                <a href="#products">Làm đẹp</a>
              </div>
            </div>

            <a href="#cart" className="rm-cart">
              <i className="bi bi-cart3" />
              <span className="rm-cart-badge">2</span>
            </a>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;