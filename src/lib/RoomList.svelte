<script>
    import { onMount } from "svelte";
    import { sdk, user } from "./sdk.js";
    import { Hash, Plus, MessageSquare, Search } from "lucide-svelte";

    let { onSelectRoom } = $props();

    let rooms = $state([]);
    let loading = $state(true);
    let error = $state("");
    let showCreate = $state(false);
    let searchTerm = $state("");
    let filteredRooms = $derived(
        rooms.filter((room) =>
            room.name.toLowerCase().includes(searchTerm.toLowerCase()),
        ),
    );
    let newRoomName = $state("");

    async function fetchRooms() {
        try {
            const data = await sdk.records.list("rooms", { sort: "name" });
            rooms = data || [];
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function createRoom() {
        if (!newRoomName) return;
        try {
            const newRoom = await sdk.records.create("rooms", {
                name: newRoomName,
            });
            rooms.push(newRoom);
            onSelectRoom(newRoom);
            newRoomName = "";
            showCreate = false;
        } catch (e) {
            alert(e.message);
        }
    }

    onMount(fetchRooms);
</script>

<div
    class="h-full flex flex-col bg-surface-950 border-r border-surface-800 w-64"
>
    <header
        class="h-16 border-b border-surface-800 flex justify-between items-center px-6"
    >
        <h2
            class="text-xs font-black tracking-[0.2em] uppercase text-surface-400"
        >
            Channels
        </h2>
        <div class="flex items-center gap-2">
            <button
                onclick={() => (showCreate = !showCreate)}
                class="p-1 hover:text-lime-primary transition-colors"
                title="Create Channel"
            >
                <Plus class="w-4 h-4" />
            </button>
        </div>
    </header>

    <div class="px-4 py-3 border-b border-surface-800">
        <div class="relative flex items-center">
            <Search class="absolute left-3 w-3 h-3 text-surface-600" />
            <input
                bind:value={searchTerm}
                type="text"
                placeholder="SEARCH_LOGS..."
                class="w-full bg-surface-900 border border-surface-800 py-2 pl-8 pr-3 text-[10px] uppercase outline-none focus:border-lime-primary transition-all placeholder:text-surface-700"
            />
        </div>
    </div>

    <div class="flex-grow overflow-y-auto overflow-x-hidden p-2 space-y-1">
        {#if showCreate}
            <div
                class="p-2 mb-4 border border-lime-primary/30 bg-lime-primary/5 animate-in fade-in slide-in-from-top-2"
            >
                <input
                    bind:value={newRoomName}
                    type="text"
                    placeholder="CH_NAME"
                    class="w-full bg-surface-900 border border-surface-800 p-2 text-xs uppercase outline-none focus:border-lime-primary"
                    onkeydown={(e) => e.key === "Enter" && createRoom()}
                />
            </div>
        {/if}

        {#if loading}
            <div class="p-4 space-y-2">
                {#each Array(5) as _}
                    <div class="h-4 bg-surface-900 animate-pulse"></div>
                {/each}
            </div>
        {:else}
            {#each filteredRooms as room}
                <button
                    onclick={() => onSelectRoom(room)}
                    class="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-400 hover:bg-surface-900 hover:text-white transition-all group rounded-none"
                >
                    <Hash
                        class="w-4 h-4 text-surface-600 group-hover:text-lime-primary transition-colors"
                    />
                    <span class="uppercase font-bold tracking-tight truncate"
                        >{room.name}</span
                    >
                </button>
            {:else}
                <div class="p-6 text-center">
                    <MessageSquare
                        class="w-8 h-8 text-surface-800 mx-auto mb-2"
                    />
                    <p
                        class="text-[10px] text-surface-600 uppercase tracking-widest font-bold"
                    >
                        No active channels
                    </p>
                </div>
            {/each}
        {/if}
    </div>

    <footer class="h-24 border-t border-surface-800 flex items-center px-6">
        <div class="flex items-center gap-3">
            <div
                class="w-8 h-8 bg-lime-primary rounded-none flex items-center justify-center text-surface-950 text-xs font-black italic"
            >
                {$user.name.charAt(0).toUpperCase()}
            </div>
            <div class="flex-grow">
                <p
                    class="text-[10px] font-black uppercase text-white truncate line-clamp-1"
                >
                    {$user.name}
                </p>
                <p
                    class="text-[9px] text-surface-600 uppercase tracking-tighter"
                >
                    V1.0.0_STABLE
                </p>
            </div>
        </div>
    </footer>
</div>
