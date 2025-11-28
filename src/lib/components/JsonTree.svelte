<script lang="ts">
  import type { JsonValue } from '$lib/types/k8s';
  import { quintOut } from 'svelte/easing';
  import { slide } from 'svelte/transition';

  export let data: JsonValue;
  export let level = 0;

  let collapsed = level > 1;

  function toggle() {
    collapsed = !collapsed;
  }

  $: isObject = typeof data === 'object' && data !== null && !Array.isArray(data);
  $: isArray = Array.isArray(data);
  $: isPrimitive = !isObject && !isArray;
  $: entries = isObject ? Object.entries(data) : isArray ? data.entries() : [];
  $: bracket_open = isArray ? '[' : '{';
  $: bracket_close = isArray ? ']' : '}';
  $: summary = isArray ? `Array(${data.length})` : `Object(${Object.keys(data).length})`;
</script>

<div class="json-node" style="--level: {level}">
  {#if isPrimitive}
    <span class="primitive {typeof data}">{JSON.stringify(data)}</span>
  {:else if entries.length > 0}
    <button on:click={toggle} class="toggle" aria-expanded={!collapsed}>
      {bracket_open}
      {#if collapsed}
        <span class="summary">...{summary}...</span>
        {bracket_close}
      {/if}
    </button>
    {#if !collapsed}
      <div class="branch" transition:slide={{ duration: 300, easing: quintOut }}>
        {#each entries as [key, value]}
          <div class="entry">
            <span class="key">{key}:</span>
            <svelte:self data={value} level={level + 1} />
          </div>
        {/each}
      </div>
      <div class="closer">{bracket_close}</div>
    {/if}
  {:else}
    <span>{bracket_open}{bracket_close}</span>
  {/if}
</div>

<style>
  .json-node {
    padding-left: 2rem;
    font-family: monospace;
    font-size: 0.9rem;
  }

  .entry {
    display: flex;
  }

  .key {
    color: #9cdcfe; /* Light blue for keys */
    margin-right: 0.5rem;
  }

  .primitive {
    font-weight: bold;
  }
  .string {
    color: #ce9178; /* Orange for strings */
  }
  .number {
    color: #b5cea8; /* Light green for numbers */
  }
  .boolean {
    color: #569cd6; /* Blue for booleans */
  }
  .null {
    color: #c586c0; /* Purple for null */
  }

  .toggle {
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    cursor: pointer;
    padding: 0;
  }

  .summary {
    color: #888;
    margin: 0 0.5rem;
  }

  .branch {
    border-left: 1px solid #444;
  }

  .closer {
    margin-top: -0.2rem;
  }
</style>
