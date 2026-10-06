<?php

use PHPUnit\Framework\TestCase;

class InSite_HMAC_Test extends TestCase {
	public function test_vectors_match_shared_package() {
		$vectors_path = dirname( __DIR__, 3 ) . '/packages/shared/test-vectors.json';
		$this->assertFileExists( $vectors_path );
		$vectors = json_decode( file_get_contents( $vectors_path ), true );
		$this->assertIsArray( $vectors );

		foreach ( $vectors as $vector ) {
			$signature = InSite_HMAC::sign(
				$vector['method'],
				$vector['path'],
				$vector['timestamp'],
				$vector['nonce'],
				$vector['body'],
				$vector['secret']
			);
			$this->assertSame(
				$vector['signature'],
				$signature,
				'Failed vector: ' . $vector['name']
			);
			$this->assertTrue(
				InSite_HMAC::signatures_equal( $signature, $vector['signature'] )
			);
		}
	}
}
