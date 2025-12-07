import { createContext, useContext } from 'react'

export type AppOptions = {
  readOnly: boolean
}

const defaultOptions: AppOptions = { readOnly: false }

export const OptionsContext = createContext<AppOptions>(defaultOptions)

export const useAppOptions = () => useContext(OptionsContext)
