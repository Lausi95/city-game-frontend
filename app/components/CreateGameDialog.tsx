"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const MapSelector = dynamic(() => import("./MapSelector"), { ssr: false });

export default function CreateGameDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [rows, setRows] = useState(1);
  const [columns, setColumns] = useState(1);
  const [point1, setPoint1] = useState<[number, number] | null>(null);
  const [point2, setPoint2] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([51.505, -0.09]);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
      },
      () => {
    },
    );
  }, []);

  const openDialog = () => {
    dialogRef.current?.showModal();
    setDialogOpen(true);
  };

  const closeDialog = () => {
    dialogRef.current?.close();
    setDialogOpen(false);
  };

  return (
    <>
      <button
        onClick={openDialog}
        className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#383838] dark:bg-white dark:text-black dark:hover:bg-[#ccc]"
      >
        Create Game
      </button>

      <dialog
        ref={dialogRef}
        className="m-auto flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-black/[.08] bg-white p-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm dark:border-white/[.145] dark:bg-black dark:text-zinc-50"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-black/[.08] px-6 py-4 dark:border-white/[.145]">
          <h2 className="text-xl font-semibold">Create New Game</h2>
          <button
            onClick={closeDialog}
            className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-black/[.04] dark:hover:bg-white/[.04]"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-black dark:border-white/[.145] dark:focus:border-white"
                placeholder="E.g., Summer Treasure Hunt"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="startTime" className="text-sm font-medium">
                  Start Time
                </label>
                <input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-black dark:border-white/[.145] dark:focus:border-white [&::-webkit-calendar-picker-indicator]:dark:invert"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="endTime" className="text-sm font-medium">
                  End Time
                </label>
                <input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-black dark:border-white/[.145] dark:focus:border-white [&::-webkit-calendar-picker-indicator]:dark:invert"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="rows" className="text-sm font-medium">
                  Rows
                </label>
                <input
                  id="rows"
                  type="number"
                  min="1"
                  value={rows}
                  onChange={(e) => setRows(parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-black dark:border-white/[.145] dark:focus:border-white"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="columns" className="text-sm font-medium">
                  Columns
                </label>
                <input
                  id="columns"
                  type="number"
                  min="1"
                  value={columns}
                  onChange={(e) => setColumns(parseInt(e.target.value) || 0)}
                  className="w-full rounded-md border border-black/[.08] bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-black dark:border-white/[.145] dark:focus:border-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Game Area Map</label>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Click twice on the map to select the top-left and bottom-right corners of your game area.
              </p>

              <div className="h-[400px] w-full overflow-hidden rounded-md border border-black/[.08] dark:border-white/[.145]">
                <MapSelector
                  center={mapCenter}
                  dialogOpen={dialogOpen}
                  point1={point1}
                  setPoint1={setPoint1}
                  point2={point2}
                  setPoint2={setPoint2}
                  rows={rows}
                  columns={columns}
                />
              </div>

              <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                <div>
                  Point 1:{" "}
                  {point1 ? `${point1[0].toFixed(5)}, ${point1[1].toFixed(5)}` : "Not selected"}
                </div>
                <div>
                  Point 2:{" "}
                  {point2 ? `${point2[0].toFixed(5)}, ${point2[1].toFixed(5)}` : "Not selected"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-black/[.08] px-6 py-4 dark:border-white/[.145]">
          <button
            onClick={closeDialog}
            className="rounded-full border border-black/[.08] px-4 py-1.5 text-sm font-medium transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          >
            Cancel
          </button>
          <button
            onClick={closeDialog}
            className="rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#383838] dark:bg-white dark:text-black dark:hover:bg-[#ccc]"
          >
            Create
          </button>
        </div>
      </dialog>
    </>
  );
}
