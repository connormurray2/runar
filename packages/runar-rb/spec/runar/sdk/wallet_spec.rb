# frozen_string_literal: true

# WalletClient / WalletProvider / WalletSigner mock-backed coverage.
#
# WalletClient is an abstract class — apps subclass it to talk to their
# BRC-100 compatible wallet. The abstract methods intentionally raise
# NotImplementedError so a forgotten override surfaces at call time, not
# silently. This spec exercises that contract plus the concrete
# WalletProvider / WalletSigner adapters against a minimal in-process mock.
#
# Mirrors the Go coverage in packages/runar-go/sdk_wallet_test.go.

require 'spec_helper'
require 'runar/sdk/wallet'

# Minimal BRC-100 wallet stub that records calls and returns deterministic
# data without network I/O.
class MockWalletClient < Runar::SDK::WalletClient
  attr_reader :calls

  def initialize(pub_key_hex: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798')
    @pub_key_hex = pub_key_hex
    @calls = []
  end

  def get_public_key(protocol_id:, key_id:)
    @calls << [:get_public_key, protocol_id, key_id]
    @pub_key_hex
  end

  def create_signature(hash_to_sign:, protocol_id:, key_id:)
    @calls << [:create_signature, hash_to_sign, protocol_id, key_id]
    '30' + ('ab' * 34)
  end

  def create_action(description:, outputs:)
    @calls << [:create_action, description, outputs]
    { txid: 'deadbeef' * 8, raw_tx: '01000000' }
  end

  def list_outputs(basket:, tags: [], limit: 100)
    @calls << [:list_outputs, basket, tags, limit]
    []
  end
end


RSpec.describe Runar::SDK::WalletClient do
  it 'raises NotImplementedError on every abstract method' do
    base = described_class.new
    expect { base.get_public_key(protocol_id: [2, 'x'], key_id: '1') }.to raise_error(NotImplementedError)
    expect { base.create_signature(hash_to_sign: '00' * 32, protocol_id: [2, 'x'], key_id: '1') }.to raise_error(NotImplementedError)
    expect { base.create_action(description: 'test', outputs: []) }.to raise_error(NotImplementedError)
    expect { base.list_outputs(basket: 'b') }.to raise_error(NotImplementedError)
  end

  it 'allows a concrete subclass to override every method' do
    wallet = MockWalletClient.new
    expect(wallet.get_public_key(protocol_id: [2, 'x'], key_id: '1')).to be_a(String)
    expect(wallet.create_signature(hash_to_sign: '00' * 32, protocol_id: [2, 'x'], key_id: '1')).to be_a(String)
    expect(wallet.create_action(description: 't', outputs: [])).to include(:txid)
    expect(wallet.list_outputs(basket: 'b')).to eq([])
  end
end


RSpec.describe Runar::SDK::WalletProvider do
  let(:wallet) { MockWalletClient.new }
  let(:signer) do
    Runar::SDK::WalletSigner.new(wallet: wallet, protocol_id: [2, 'test'], key_id: '1')
  end

  it 'returns the configured network (default mainnet)' do
    wp = described_class.new(wallet: wallet, signer: signer, basket: 'b')
    expect(wp.get_network).to eq('mainnet')
  end

  it 'returns the configured network override' do
    wp = described_class.new(wallet: wallet, signer: signer, basket: 'b', network: 'testnet')
    expect(wp.get_network).to eq('testnet')
  end

  # R-179: arc_url and network used to be defaulted independently, so a testnet
  # provider broadcast to the MAINNET ARC. The default is now BSV Broadcaster,
  # which has one endpoint per network, so the default follows the network.
  it 'defaults to the BSV Broadcaster endpoint for its network (R-179)' do
    {
      {} => 'https://arcade-us-1.bsvblockchain.tech/tx',
      { network: 'mainnet' } => 'https://arcade-us-1.bsvblockchain.tech/tx',
      { network: 'testnet' } => 'https://arcade-v2-testnet-us-1.bsvblockchain.tech/tx'
    }.each do |extra, url|
      wp = described_class.new(wallet: wallet, signer: signer, basket: 'b', **extra)
      expect(wp.instance_variable_get(:@arc_url)).to be_nil
      expect(wp.instance_variable_get(:@broadcast_url)).to eq(url)
    end
  end

  it 'keeps the ARC path when arc_url is given (R-179)' do
    wp = described_class.new(wallet: wallet, signer: signer, basket: 'b',
                             network: 'testnet', arc_url: 'https://arc.testnet.example')
    expect(wp.instance_variable_get(:@broadcast_url)).to eq('https://arc.testnet.example/v1/tx')
  end

  it 'refuses a network with no default broadcaster (R-179)' do
    expect do
      described_class.new(wallet: wallet, signer: signer, basket: 'b', network: 'regtest')
    end.to raise_error(ArgumentError, /regtest/)
  end

  it 'posts the raw tx to the BSV Broadcaster /tx endpoint by default' do
    require 'net/http'
    sent = nil
    fake_http = Object.new
    fake_http.define_singleton_method(:use_ssl=) { |_| }
    fake_http.define_singleton_method(:open_timeout=) { |_| }
    fake_http.define_singleton_method(:read_timeout=) { |_| }
    fake_http.define_singleton_method(:request) do |req|
      sent = req
      resp = Net::HTTPAccepted.new('1.1', '202', 'Accepted')
      resp.instance_variable_set(:@read, true)
      resp.instance_variable_set(:@body, '{"txid":"ab","status":202,"txStatus":"RECEIVED"}')
      resp
    end
    host = nil
    allow(Net::HTTP).to receive(:new) { |h, _port| host = h; fake_http }

    wp = described_class.new(wallet: wallet, signer: signer, basket: 'b', network: 'testnet')
    expect(wp.broadcast('0100')).to eq('ab')
    expect(host).to eq('arcade-v2-testnet-us-1.bsvblockchain.tech')
    expect(sent.path).to eq('/tx')
    expect(sent['Content-Type']).to eq('application/octet-stream')
    expect(sent.body).to eq(['0100'].pack('H*'))
  end

  it 'returns the configured fee rate (default 100)' do
    wp = described_class.new(wallet: wallet, signer: signer, basket: 'b')
    expect(wp.get_fee_rate).to eq(100)
  end

  it 'returns the configured fee rate override' do
    wp = described_class.new(wallet: wallet, signer: signer, basket: 'b', fee_rate: 250)
    expect(wp.get_fee_rate).to eq(250)
  end

  it 'returns nil from get_contract_utxo (wallets do not track contract UTXOs)' do
    wp = described_class.new(wallet: wallet, signer: signer, basket: 'b')
    expect(wp.get_contract_utxo('deadbeef')).to be_nil
  end

  it 'returns a cached tx from get_raw_transaction after cache_tx' do
    wp = described_class.new(wallet: wallet, signer: signer, basket: 'b')
    wp.cache_tx('abc', '01000000deadbeef')
    expect(wp.get_raw_transaction('abc')).to eq('01000000deadbeef')
  end

  it 'caches a raw transaction via cache_tx + get_raw_transaction roundtrip' do
    wp = described_class.new(wallet: wallet, signer: signer, basket: 'b')
    raw = '01000000' + '00' * 20
    wp.cache_tx('abc123', raw)
    expect(wp.get_raw_transaction('abc123')).to eq(raw)
  end
end


RSpec.describe Runar::SDK::WalletSigner do
  let(:wallet) { MockWalletClient.new }
  subject(:signer) do
    described_class.new(wallet: wallet, protocol_id: [2, 'test'], key_id: '1')
  end

  it 'caches the derived public key' do
    first  = signer.get_public_key
    second = signer.get_public_key
    expect(first).to eq(second)
    # One call to the wallet despite two requests
    expect(wallet.calls.count { |c| c.first == :get_public_key }).to eq(1)
  end

  it 'computes a BSV address from the cached public key' do
    addr = signer.get_address
    expect(addr).to be_a(String)
    expect(addr.length).to eq(40) # 20-byte RIPEMD160 as hex
  end

  it 'sign_hash delegates to the wallet (no sighash-type byte appended)' do
    sig = signer.sign_hash('ab' * 32)
    expect(sig).to be_a(String)
    # Last call was a signature request
    expect(wallet.calls.last.first).to eq(:create_signature)
  end
end
