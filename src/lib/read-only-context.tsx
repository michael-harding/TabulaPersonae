import { createContext, useContext } from 'solid-js'

const ReadOnlyContext = createContext(false)
export const ReadOnlyProvider = ReadOnlyContext.Provider
export const useReadOnly = () => useContext(ReadOnlyContext)
