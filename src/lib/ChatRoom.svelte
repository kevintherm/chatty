<script>
    import { onMount, onDestroy, tick } from "svelte";
    import { sdk, user } from "./sdk.js";
    import { cryptoService } from "./crypto.js";
    import { Send, Hash, User as UserIcon } from "lucide-svelte";

    let { room } = $props();

    let messages = $state([]);
    let newMessage = $state("");
    let loading = $state(true);
    let scrollContainer = $state();
    let processingIds = new Set();

    async function fetchMessages() {
        if (!room) return;
        loading = true;
        try {
            const data = await sdk.records.list("messages", {
                filter: `room_id = "${room.id}"`,
                sort: "-created_at",
                expand: "user_id",
            });
            const rawMessages = data || [];

            const keys = await cryptoService.ensureKeys($user.id);
            messages = (
                await Promise.all(
                    rawMessages.map(async (msg) => {
                        const decrypted = await cryptoService.decrypt(
                            msg.content,
                            keys,
                        );
                        return {
                            ...msg,
                            content: decrypted || "[ENCRYPT_LOCKED]",
                        };
                    }),
                )
            ).reverse();

            scrollToBottom();
        } catch (e) {
            console.error(e);
        } finally {
            loading = false;
        }
    }

    async function sendMessage() {
        if (!newMessage.trim() || !room) return;
        const content = newMessage;
        newMessage = "";

        try {
            const recipient =
                room.from_id === $user.id
                    ? room.expand?.to_id
                    : room.expand?.from_id;
            if (!recipient?.public_key) {
                throw new Error(
                    "Recipient does not have an active secure terminal (Public Key missing)",
                );
            }

            const myKeys = await cryptoService.ensureKeys($user.id);
            const encryptedContent = await cryptoService.encrypt(
                content,
                recipient.public_key,
                myKeys.publicKey,
            );

            await sdk.records.create("messages", {
                room_id: room.id,
                user_id: $user.id,
                content: encryptedContent,
            });
        } catch (e) {
            alert(e.message);
        }
    }

    function handleRealtime(event, record) {
        if (!record) return;
        if (event === "record.created" && record.room_id === room.id) {
            if (
                messages.find((m) => m.id === record.id) ||
                processingIds.has(record.id)
            )
                return;

            processingIds.add(record.id);
            (async () => {
                try {
                    const keys = await cryptoService.ensureKeys($user.id);
                    const decrypted = await cryptoService.decrypt(
                        record.content,
                        keys,
                    );

                    if (messages.find((m) => m.id === record.id)) return;

                    if (!record.expand?.user_id) {
                        const sender =
                            record.user_id === room.from_id
                                ? room.expand?.from_id
                                : room.expand?.to_id;

                        if (sender) {
                            record.expand = {
                                ...record.expand,
                                user_id: sender,
                            };
                        }
                    }

                    messages.push({
                        ...record,
                        content: decrypted || "[ENCRYPT_LOCKED]",
                    });
                    scrollToBottom();
                } catch (e) {
                    console.error("Realtime decryption failed:", e);
                } finally {
                    processingIds.delete(record.id);
                }
            })();
        }
    }

    async function scrollToBottom() {
        await tick();
        if (scrollContainer) {
            requestAnimationFrame(() => {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            });
        }
    }

    $effect(() => {
        if (room) {
            fetchMessages();
            sdk.realtime.subscribe(
                "messages",
                { filter: `room_id = "${room.id}"` },
                handleRealtime,
            );
        }
    });

    onDestroy(() => {
        sdk.realtime.unsubscribe("messages");
    });
</script>

<div class="flex flex-col h-full bg-black text-white">
    <header
        class="h-16 border-b border-surface-800 flex items-center justify-between px-6 bg-surface-950/50 backdrop-blur-md z-10 shrink-0"
    >
        <div class="flex items-center gap-3">
            <div
                class="w-10 h-10 bg-surface-900 border border-surface-800 flex items-center justify-center text-lime-primary"
            >
                <Hash class="w-5 h-5" />
            </div>
            <div>
                <h2 class="text-sm font-black uppercase tracking-wider">
                    {room.from_id === $user.id
                        ? room.expand?.to_id?.name
                        : room.expand?.from_id?.name || "SELECT CHANNEL"}
                </h2>
            </div>
        </div>
    </header>

    <div
        bind:this={scrollContainer}
        class="flex-grow overflow-y-auto p-6 pb-10 space-y-6"
    >
        {#if loading}
            <div class="flex items-center justify-center h-full">
                <div
                    class="text-[10px] font-black uppercase tracking-[0.5em] text-surface-700 animate-pulse"
                >
                    Synchronizing Data...
                </div>
            </div>
        {:else}
            {#each messages as msg (msg.id)}
                <div
                    class="flex gap-4 group animate-in fade-in slide-in-from-bottom-2 duration-300"
                >
                    <div
                        class="flex-shrink-0 w-8 h-8 bg-surface-900 border border-surface-800 flex items-center justify-center text-surface-600 group-hover:bg-lime-primary/10 group-hover:text-lime-primary transition-colors"
                    >
                        <UserIcon class="w-4 h-4" />
                    </div>
                    <div class="space-y-1 max-w-[80%]">
                        <header class="flex items-center gap-2">
                            <span
                                class="text-[10px] font-black uppercase text-white tracking-tight"
                            >
                                {msg.user_id === $user.id
                                    ? $user.name
                                    : msg.expand?.user_id?.name ||
                                      "ANONYMOUS_OP"}
                            </span>
                            <span class="text-[9px] text-surface-600 font-bold">
                                {new Date(msg.created_at).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" },
                                )}
                            </span>
                        </header>
                        <div
                            class="text-sm text-surface-300 leading-relaxed font-medium break-all selection:bg-lime-primary selection:text-black"
                        >
                            {msg.content}
                        </div>
                    </div>
                </div>
            {:else}
                <div
                    class="flex flex-col items-center justify-center h-full text-surface-800 space-y-2 opacity-50"
                >
                    <div class="text-xs font-black uppercase tracking-widest">
                        Beginning of Log
                    </div>
                    <div class="w-px h-12 bg-surface-800"></div>
                </div>
            {/each}
        {/if}
    </div>

    <footer
        class="h-24 bg-surface-950/50 backdrop-blur-md border-t border-surface-800 flex items-center px-6 shrink-0"
    >
        <form
            onsubmit={(e) => {
                e.preventDefault();
                sendMessage();
            }}
            class="relative flex items-center w-full"
        >
            <input
                bind:value={newMessage}
                type="text"
                placeholder={`UPLINK TO #${(room.from_id === $user.id ? room.expand?.to_id?.name : room.expand?.from_id?.name || "NULL").toUpperCase()}...`}
                class="w-full bg-surface-900 border border-surface-800 focus:border-lime-primary focus:ring-1 focus:ring-lime-primary/20 p-4 pr-16 outline-none transition-all placeholder:text-surface-700 text-sm font-medium"
                autocomplete="off"
            />
            <button
                type="submit"
                disabled={!newMessage.trim()}
                class="absolute right-2 p-2 bg-white text-black hover:bg-lime-primary disabled:opacity-30 disabled:hover:bg-white transition-all rounded-none"
            >
                <Send class="w-5 h-5" />
            </button>
        </form>
    </footer>
</div>

<style>
    ::-webkit-scrollbar {
        display: none;
    }
    div {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
