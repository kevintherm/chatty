<script>
    import { user, sdk, refreshUser } from "./lib/sdk.js";
    import Auth from "./lib/Auth.svelte";
    import RoomList from "./lib/RoomList.svelte";
    import ChatRoom from "./lib/ChatRoom.svelte";
    import LogoSvg from "./assets/logo.svg";

    let selectedRoom = $state(null);

    async function handleLogout() {
        await sdk.auth.logout("users");
        await refreshUser();
        selectedRoom = null;
    }
</script>

<main
    class="h-screen w-screen overflow-hidden flex bg-black text-white selection:bg-lime-primary selection:text-black font-sans"
>
    {#if !$user}
        <div class="flex-grow flex items-center justify-center">
            <Auth />
        </div>
    {:else}
        <RoomList onSelectRoom={(room) => (selectedRoom = room)} onLogout={handleLogout} />

        <div class="flex-grow flex flex-col h-full bg-black">
            {#if selectedRoom}
                <ChatRoom room={selectedRoom} />
            {:else}
                <div
                    class="flex-grow flex flex-col items-center justify-center space-y-8 p-12 text-center"
                >
                    <div class="relative">
                        <img
                            src={LogoSvg}
                            alt=""
                            class="w-32 h-32 text-surface-900"
                        />
                    </div>

                    <div class="space-y-2">
                        <p
                            class="text-[10px] text-surface-600 uppercase tracking-[0.4em] font-bold"
                        >
                            SELECT A CHANNEL ...
                        </p>
                    </div>

                    <div
                        class="grid grid-cols-1 gap-4 w-full max-w-sm pt-8 border-t border-surface-900"
                    >
                        <div
                            class="p-4 border border-surface-900 bg-surface-950/50"
                        >
                            <p
                                class="text-[9px] text-surface-600 uppercase font-black mb-1"
                            >
                                User
                            </p>
                            <p class="text-xs font-bold uppercase truncate">
                                {$user.name}
                            </p>
                        </div>
                    </div>
                </div>
            {/if}
        </div>


    {/if}
</main>

<style>
    :global(body) {
        margin: 0;
        background: black;
    }
</style>
