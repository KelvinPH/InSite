<?php
/**
 * Tools → InSite settings page.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class InSite_Admin {
	public function hooks() {
		add_action( 'admin_menu', array( $this, 'register_menu' ) );
		add_action( 'admin_post_insite_regenerate_key', array( $this, 'regenerate_key' ) );
	}

	public function register_menu() {
		add_management_page(
			__( 'InSite', 'insite-connector' ),
			__( 'InSite', 'insite-connector' ),
			'manage_options',
			'insite-connector',
			array( $this, 'render_page' )
		);
	}

	public function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You do not have permission to access this page.', 'insite-connector' ) );
		}

		$secret = get_option( INSITE_OPTION_SECRET );
		$url    = untrailingslashit( home_url() );
		$key    = '';
		if ( $secret ) {
			$payload = wp_json_encode(
				array(
					'url'    => $url,
					'secret' => $secret,
				)
			);
			$key = rtrim( strtr( base64_encode( $payload ), '+/', '-_' ), '=' );
		}

		$regenerated = isset( $_GET['regenerated'] ) && '1' === $_GET['regenerated']; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		?>
		<div class="wrap">
			<h1><?php echo esc_html__( 'InSite Connector', 'insite-connector' ); ?></h1>
			<?php if ( $regenerated ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php echo esc_html__( 'Connection key regenerated. Update the site in your InSite dashboard.', 'insite-connector' ); ?></p></div>
			<?php endif; ?>
			<p><?php echo esc_html__( 'Copy this connection key into your InSite dashboard to pair this site.', 'insite-connector' ); ?></p>
			<textarea readonly rows="4" class="large-text code" onclick="this.select();"><?php echo esc_textarea( $key ); ?></textarea>
			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="margin-top:1em;">
				<?php wp_nonce_field( 'insite_regenerate_key' ); ?>
				<input type="hidden" name="action" value="insite_regenerate_key" />
				<?php submit_button( __( 'Regenerate key', 'insite-connector' ), 'delete', 'submit', false ); ?>
			</form>
		</div>
		<?php
	}

	public function regenerate_key() {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'Forbidden', 'insite-connector' ) );
		}
		check_admin_referer( 'insite_regenerate_key' );

		$secret = wp_generate_password( 48, true, true );
		update_option( INSITE_OPTION_SECRET, $secret, false );

		wp_safe_redirect(
			add_query_arg(
				array(
					'page'        => 'insite-connector',
					'regenerated' => '1',
				),
				admin_url( 'tools.php' )
			)
		);
		exit;
	}
}
