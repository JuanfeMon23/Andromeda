import { describe, expect, it } from 'vitest'
import { mapApiErrorToForm } from './mapApiErrorToForm'

const fields = ['email', 'phone', 'address', 'first_name']

describe('mapApiErrorToForm', () => {
  it('acepta un error con code/message/details (forma de useApi)', () => {
    const err = Object.assign(new Error('Ya existe'), {
      code: 'conflict',
      details: { email: 'a@b.co' }
    })
    const out = mapApiErrorToForm(err, { fields })
    expect(out.fieldErrors).toEqual({ email: 'Ya existe' })
    expect(out.formError).toBeNull()
  })

  it('acepta el error crudo de $fetch (data.{code,message,details})', () => {
    const err = {
      message: 'fetch failed',
      data: { code: 'validation_error', message: 'Faltan datos', details: { field: 'phone' } }
    }
    const out = mapApiErrorToForm(err, { fields })
    expect(out.fieldErrors).toEqual({ phone: 'Faltan datos' })
  })

  it('missing_fields marca cada campo como obligatorio', () => {
    const err = {
      data: {
        code: 'validation_error',
        message: 'Faltan datos del paciente para cerrar la recepcion.',
        details: { missing_fields: ['email', 'address', 'desconocido'] }
      }
    }
    const out = mapApiErrorToForm(err, { fields })
    expect(out.fieldErrors).toEqual({
      email: 'Este campo es obligatorio.',
      address: 'Este campo es obligatorio.'
    })
    expect(out.formError).toBeNull()
  })

  it('422 de schema de FastAPI se ubica por el último segmento de loc', () => {
    const err = {
      data: { detail: [{ loc: ['body', 'phone'], msg: 'Campo requerido', type: 'missing' }] }
    }
    const out = mapApiErrorToForm(err, { fields })
    expect(out.fieldErrors).toEqual({ phone: 'Campo requerido' })
  })

  it('sin campo conocido queda como error general', () => {
    const err = { data: { code: 'conflict', message: 'No disponible', details: { otro: 1 } } }
    const out = mapApiErrorToForm(err, { fields })
    expect(out.fieldErrors).toEqual({})
    expect(out.formError).toBe('No disponible')
  })

  it('respeta fieldMap', () => {
    const err = { data: { code: 'conflict', message: 'Duplicado', details: { correo: 'x' } } }
    const out = mapApiErrorToForm(err, { fields, fieldMap: { correo: 'email' } })
    expect(out.fieldErrors).toEqual({ email: 'Duplicado' })
  })

  it('un error desconocido da un mensaje genérico', () => {
    expect(mapApiErrorToForm('boom', { fields }).formError).toBeTruthy()
  })
})
