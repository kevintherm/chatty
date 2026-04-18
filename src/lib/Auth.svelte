<script>
    import { sdk, refreshUser } from "./sdk.js";
    import { cryptoService } from "./crypto.js";
    import { LockKeyhole, Mail, User, LogIn, UserPlus } from "lucide-svelte";
    import Logo from "./Logo.svelte";

    let isLogin = $state(true);
    let email = $state("");
    let password = $state("");
    let name = $state("");
    let loading = $state(false);
    let error = $state("");

    async function handleSubmit() {
        loading = true;
        error = "";
        try {
            if (isLogin) {
                await sdk.auth.login("users", email, password);
            } else {
                await sdk.records.create("users", {
                    email,
                    password,
                    name,
                });
                await sdk.auth.login("users", email, password);
            }
            const userData = await refreshUser();

            if (userData) {
                const keys = await cryptoService.ensureKeys(userData.id);
                if (userData.public_key !== keys.publicKey) {
                    await sdk.records.update("users", userData.id, {
                        public_key: keys.publicKey,
                    });
                    await refreshUser();
                }
            }
        } catch (e) {
            error = e.message || "Authentication failed";
        } finally {
            loading = false;
        }
    }
</script>

<div
    class="flex flex-col items-center justify-center min-h-[60vh] p-4 text-white"
>
    <div
        class="w-full max-w-sm p-8 space-y-6 border border-surface-700 bg-surface-950 rounded-none shadow-2xl"
    >
        <header class="text-center space-y-2">
            <Logo class="text-4xl" />
            <p class="text-surface-400 text-xs tracking-widest uppercase">
                {isLogin ? "Welcome back, operator" : "Create new identity"}
            </p>
        </header>

        <form
            onsubmit={(e) => {
                e.preventDefault();
                handleSubmit();
            }}
            class="space-y-4"
        >
            {#if !isLogin}
                <div class="space-y-1">
                    <label
                        for="name"
                        class="text-[10px] uppercase tracking-widest text-surface-500 font-bold"
                        >Alias</label
                    >
                    <div class="relative">
                        <User
                            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"
                        />
                        <input
                            bind:value={name}
                            type="text"
                            placeholder="Your name"
                            class="w-full pl-10 pr-4 py-3 bg-surface-900 border border-surface-800 focus:border-lime-primary focus:ring-1 focus:ring-lime-primary/20 outline-none transition-all placeholder:text-surface-700 text-sm"
                            required
                        />
                    </div>
                </div>
            {/if}

            <div class="space-y-1">
                <label
                    for="email"
                    class="text-[10px] uppercase tracking-widest text-surface-500 font-bold"
                    >Terminal ID (Email)</label
                >
                <div class="relative">
                    <Mail
                        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"
                    />
                    <input
                        bind:value={email}
                        type="email"
                        placeholder="operator@chatty.local"
                        class="w-full pl-10 pr-4 py-3 bg-surface-900 border border-surface-800 focus:border-lime-primary focus:ring-1 focus:ring-lime-primary/20 outline-none transition-all placeholder:text-surface-700 text-sm"
                        required
                    />
                </div>
            </div>

            <div class="space-y-1">
                <label
                    for="password"
                    class="text-[10px] uppercase tracking-widest text-surface-500 font-bold"
                    >Access Code</label
                >
                <div class="relative">
                    <LockKeyhole
                        class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500"
                    />
                    <input
                        bind:value={password}
                        type="password"
                        placeholder="••••••••"
                        class="w-full pl-10 pr-4 py-3 bg-surface-900 border border-surface-800 focus:border-lime-primary focus:ring-1 focus:ring-lime-primary/20 outline-none transition-all placeholder:text-surface-700 text-sm"
                        required
                    />
                </div>
            </div>

            {#if error}
                <p
                    class="text-[10px] text-red-500 uppercase tracking-tighter bg-red-500/10 p-2 border border-red-500/20"
                >
                    {error}
                </p>
            {/if}

            <button
                type="submit"
                disabled={loading}
                class="w-full py-4 bg-surface-50 text-surface-950 font-black uppercase tracking-widest text-xs hover:bg-lime-primary transition-colors flex items-center justify-center gap-2 group disabled:opacity-50"
            >
                {#if loading}
                    <span class="animate-pulse">PROCESSING...</span>
                {:else}
                    {isLogin ? "INITIATE SESSION" : "REGISTER IDENTITY"}
                    {#if isLogin}
                        <LogIn
                            class="w-4 h-4 group-hover:translate-x-1 transition-transform"
                        />
                    {:else}
                        <UserPlus
                            class="w-4 h-4 group-hover:translate-x-1 transition-transform"
                        />
                    {/if}
                {/if}
            </button>
        </form>

        <footer class="text-center pt-4">
            <button
                onclick={() => (isLogin = !isLogin)}
                class="text-[10px] text-surface-500 hover:text-white uppercase tracking-widest transition-colors font-bold"
            >
                {isLogin
                    ? "Need an identity? Register here"
                    : "Return to Login Console"}
            </button>
        </footer>
    </div>
</div>
