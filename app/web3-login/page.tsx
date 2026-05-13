'use client';

import type { EthereumWallet } from '@supabase/auth-js';
import type { OnboardAPI, WalletState } from '@web3-onboard/core';
import Onboard from '@web3-onboard/core';
import injectedModule from '@web3-onboard/injected-wallets';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

let onboardSingleton: OnboardAPI | null = null;

function getOnboard(): OnboardAPI {
    if (typeof window === 'undefined') {
        throw new Error('Wallet connection is only available in the browser.');
    }
    if (!onboardSingleton) {
        const injected = injectedModule();
        onboardSingleton = Onboard({
            wallets: [injected],
            chains: [
                {
                    id: '0x1',
                    token: 'ETH',
                    label: 'Ethereum Mainnet',
                    rpcUrl:
                        process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL ??
                        'https://ethereum.publicnode.com',
                },
            ],
            appMetadata: {
                name: 'Supabase Task Manager',
                description: 'Connect your wallet to sign in with Ethereum.',
            },
        });
    }
    return onboardSingleton;
}

function toEthereumWallet({ provider, accounts }: WalletState): EthereumWallet {
    const address = accounts[0].address;
    return {
        address,
        request: (args) => provider.request(args as Parameters<typeof provider.request>[0]),
        on: (event, listener) => provider.on(event as never, listener as never),
        removeListener: (event, listener) => provider.removeListener(event as never, listener as never),
    };
}

export default function Web3Login() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleWeb3Login = async () => {
        setLoading(true);
        try {
            const onboard = getOnboard();
            const wallets = await onboard.connectWallet();
            if (!wallets.length) {
                return;
            }

            const ethereumWallet = toEthereumWallet(wallets[0]);
            const { error } = await supabase.auth.signInWithWeb3({
                chain: 'ethereum',
                wallet: ethereumWallet,
            });

            if (error) {
                console.error('Web3 sign-in error:', error.message);
                alert('Web3 sign-in failed. Make sure you have a wallet installed.');
            } else {
                router.push('/dashboard');
            }
        } catch (e) {
            console.error('Web3 login:', e);
            alert('Could not connect wallet or sign in.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <button type="button" onClick={handleWeb3Login} disabled={loading}>
                {loading ? 'Signing in...' : 'Connect Wallet & Sign In'}
            </button>
        </div>
    );
}
