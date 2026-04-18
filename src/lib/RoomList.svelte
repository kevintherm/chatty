<script>
    import { onMount, onDestroy } from "svelte";
    import { sdk, user } from "./sdk.js";
    import { Hash, Plus, MessageSquare, Search, User as UserIcon } from "lucide-svelte";
    import Logo from "./Logo.svelte";

    let { onSelectRoom } = $props();

    let rooms = $state([]);
    let loading = $state(true);
    let error = $state("");
    let showCreate = $state(false);
    let searchTerm = $state("");
    let users = $state([]);
    let filteredRooms = $derived(
        rooms.filter((room) => {
            const partner = room.from_id === $user.id ? room.expand?.to_id : room.expand?.from_id;
            const search = searchTerm.toLowerCase();
            return (
                room.name.toLowerCase().includes(search) ||
                partner?.name?.toLowerCase().includes(search)
            );
        }),
    );
    let filteredUsers = $derived(
        searchTerm.length > 2 
            ? users.filter(u => 
                u.id !== $user.id && 
                (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                 u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
              )
            : []
    );
    let newRoomName = $state("");

    async function fetchRooms() {
        try {
            const data = await sdk.records.list("rooms", {
                sort: "name",
                expand: "from_id,to_id",
            });
            rooms = data || [];
        } catch (e) {
            error = e.message;
        } finally {
            loading = false;
        }
    }

    async function fetchUsers() {
        try {
            const data = await sdk.records.list("users");
            users = data || [];
        } catch (e) {
            console.error(e);
        }
    }

    async function startChat(targetUser) {
        try {
            const existing = rooms.find(r => 
                (r.from_id === $user.id && r.to_id === targetUser.id) ||
                (r.from_id === targetUser.id && r.to_id === $user.id)
            );
            if (existing) {
                onSelectRoom(existing);
                return;
            }

            const newRoom = await sdk.records.create("rooms", {
                name: `CH-${Math.random().toString(16).slice(2, 8).toUpperCase()}`,
                from_id: $user.id,
                to_id: targetUser.id,
            });
            await fetchRooms();
            const created = rooms.find(r => r.id === newRoom.id);
            onSelectRoom(created || newRoom);
            searchTerm = "";
        } catch (e) {
            alert(e.message);
        }
    }

    async function createRoom() {
        if (!newRoomName) return;
        try {
            alert("Please search for a user to start a secure chat.");
        } catch (e) {
            alert(e.message);
        }
    }

    function handleRoomRealtime(event, record) {
        if (!record) return;
        if (event === "record.created") {
            if (record.from_id === $user.id || record.to_id === $user.id) {
                if (!rooms.find((r) => r.id === record.id)) {
                    fetchRooms();
                }
            }
        }
    }

    onMount(() => {
        fetchRooms();
        fetchUsers();
        sdk.realtime.subscribe("rooms", {}, handleRoomRealtime);
    });

    onDestroy(() => {
        sdk.realtime.unsubscribe("rooms");
    });
</script>

<div
    class="h-full flex flex-col bg-surface-950 border-r border-surface-800 w-64"
>
    <header
        class="h-16 border-b border-surface-800 flex justify-between items-center px-6"
    >
        <Logo class="text-lg" />
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
            {#if searchTerm.length > 2 && filteredUsers.length > 0}
                <div class="mb-4">
                    <p class="text-[9px] uppercase tracking-widest text-lime-primary/50 font-black px-3 mb-2">New Identity Found</p>
                    {#each filteredUsers as u}
                        <button
                            onclick={() => startChat(u)}
                            class="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-400 hover:bg-lime-primary/10 hover:text-white transition-all group rounded-none border-l-2 border-transparent hover:border-lime-primary"
                        >
                            <UserIcon class="w-4 h-4 text-surface-600 group-hover:text-lime-primary" />
                            <div class="text-left flex-grow">
                                <span class="uppercase font-bold tracking-tight block leading-none">{u.name}</span>
                                <span class="text-[8px] text-surface-600 uppercase font-black">
                                    {u.public_key ? "SECURE_TERMINAL_ONLINE" : "LEGACY_UPLINK_ONLY"}
                                </span>
                            </div>
                        </button>
                    {/each}
                    <div class="h-px bg-surface-800 my-4 mx-3"></div>
                </div>
            {/if}

            {#each filteredRooms as room}
                <button
                    onclick={() => onSelectRoom(room)}
                    class="w-full flex items-center gap-2 px-3 py-2 text-sm text-surface-400 hover:bg-surface-900 hover:text-white transition-all group rounded-none"
                >
                    <Hash
                        class="w-4 h-4 text-surface-600 group-hover:text-lime-primary transition-colors"
                    />
                    <div class="text-left flex-grow truncate">
                        <span class="uppercase font-bold tracking-tight block leading-none">
                            {room.from_id === $user.id ? room.expand?.to_id?.name : room.expand?.from_id?.name || room.name}
                        </span>
                        <span class="text-[8px] text-surface-600 uppercase font-black">{room.name}</span>
                    </div>
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
