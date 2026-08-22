function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-container">
        {/* Brand */}
        <div className="footer-brand">
          <a href="/" className="footer-logo">
            RiskMind <span>AI</span>
          </a>

          <p className="footer-description">
            Nền tảng thương mại điện tử ứng dụng AI hỗ trợ người bán
            phân tích rủi ro người mua và đưa ra quyết định hiệu quả hơn.
          </p>

          <div className="footer-socials">
            <a href="#" aria-label="Facebook">
              f
            </a>
            <a href="#" aria-label="Instagram">
              ◎
            </a>
            <a href="#" aria-label="GitHub">
              ◇
            </a>
          </div>
        </div>

        {/* Shopping */}
        <div className="footer-column">
          <h4>Mua sắm</h4>

          <a href="#products">Sản phẩm</a>
          <a href="#shops">Cửa hàng</a>
          <a href="#orders">Đơn hàng</a>
          <a href="#wishlist">Yêu thích</a>
        </div>

        {/* Seller */}
        <div className="footer-column">
          <h4>Dành cho người bán</h4>

          <a href="#seller">Kênh người bán</a>
          <a href="#risk">Phân tích rủi ro</a>
          <a href="#recommendation">Khuyến nghị AI</a>
          <a href="#dashboard">Dashboard</a>
        </div>

        {/* Support */}
        <div className="footer-column">
          <h4>Hỗ trợ</h4>

          <a href="#help">Trung tâm hỗ trợ</a>
          <a href="#contact">Liên hệ</a>
          <a href="#privacy">Chính sách bảo mật</a>
          <a href="#terms">Điều khoản sử dụng</a>
        </div>

        {/* Contact */}
        <div className="footer-column footer-contact">
          <h4>Liên hệ</h4>

          <p>support@riskmind.ai</p>
          <p>+84 123 456 789</p>
          <p>TP. Hồ Chí Minh, Việt Nam</p>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 RiskMind AI. All rights reserved.</span>

        <div>
          <a href="#privacy">Bảo mật</a>
          <a href="#terms">Điều khoản</a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;